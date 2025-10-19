# Kafka + Redis: Local Ops, Backup/Restore, and Best Practices

This guide covers running Confluent Kafka (KRaft) + Provectus Kafka UI from Docker, backing up topics/messages, managing partitions and retention, and adding Redis for your app.

The configuration here matches the current project code:
- KafkaJS producer/consumer default broker: `localhost:9092`
- Env overrides: `KAFKA_BROKERS` (comma-separated) or `KAFKA_BROKER`
- Redis client default: `redis://localhost:6379` via `REDIS_URL`

## Services in `docker-compose.kafka.yml`

The repo includes `docker-compose.kafka.yml` with:
- `maaxly-kafka` (Confluent `cp-kafka:7.5.0`) in KRaft mode, dual listeners:
  - Internal: `kafka:29092` for container-to-container
  - Host: `localhost:9092` for your Node app on the host
- `maaxly-kafka-ui` (Provectus Kafka UI) on `http://localhost:8081`
- `maaxly-redis` (Redis 7 with AOF persistence) on `redis://localhost:6379`
- `maaxly-redisinsight` (RedisInsight UI) on `http://localhost:5540`

Volumes:

```yaml
volumes:
  kafka_data:
    driver: local
  redis_data:
    driver: local
  redisinsight_data:
    driver: local
```

Point the server to Redis (host): `REDIS_URL=redis://localhost:6379`.

### RedisInsight usage

- Open RedisInsight at: `http://localhost:5540`
- Add a database connection:
  - Host: `localhost`
  - Port: `6379`
  - Name: `maaxly-local`
  - Username/Password: leave blank (unless you configure auth)
- You can browse keys, visualize types, run commands, and monitor performance.

## Start/Stop (Windows PowerShell)

- Start Kafka + UI (and Redis if added):

```pwsh
docker compose -f "docker-compose.kafka.yml" up -d
```

- Stop:

```pwsh
docker compose -f "docker-compose.kafka.yml" down
```

- App environment (host):

```pwsh
$env:KAFKA_BROKERS = "localhost:9092"
$env:REDIS_URL = "redis://localhost:6379"
# Start Node server
npm run server
```

## Topic management

- List topics:

```pwsh
docker exec maaxly-kafka bash -lc "kafka-topics --bootstrap-server kafka:29092 --list"
```

- Describe a topic:

```pwsh
docker exec maaxly-kafka bash -lc "kafka-topics --bootstrap-server kafka:29092 --describe --topic chat-messages"
```

- Create a topic (example: 3 partitions, replication factor 1 for local):

```pwsh
docker exec maaxly-kafka bash -lc "kafka-topics --bootstrap-server kafka:29092 --create --topic chat-messages --partitions 3 --replication-factor 1"
```

- Increase partitions (irreversible, affects key-based ordering):

```pwsh
docker exec maaxly-kafka bash -lc "kafka-topics --bootstrap-server kafka:29092 --alter --topic chat-messages --partitions 6"
```

- Set per-topic retention (size or time):

```pwsh
# Retain up to 7 days
docker exec maaxly-kafka bash -lc "kafka-configs --bootstrap-server kafka:29092 --entity-type topics --entity-name chat-messages --alter --add-config retention.ms=604800000"

# Retain up to 5 GB
docker exec maaxly-kafka bash -lc "kafka-configs --bootstrap-server kafka:29092 --entity-type topics --entity-name chat-messages --alter --add-config retention.bytes=5368709120"
```

- Enable compaction (useful for key-latest semantics, not typical for chat streams):

```pwsh
docker exec maaxly-kafka bash -lc "kafka-configs --bootstrap-server kafka:29092 --entity-type topics --entity-name some-kv-topic --alter --add-config cleanup.policy=compact"
```

## Consumer groups and offsets

- List groups:

```pwsh
docker exec maaxly-kafka bash -lc "kafka-consumer-groups --bootstrap-server kafka:29092 --list"
```

- Describe a group (lag, offsets):

```pwsh
docker exec maaxly-kafka bash -lc "kafka-consumer-groups --bootstrap-server kafka:29092 --group chat-consumer-group --describe"
```

- Reset offsets (use with care):

```pwsh
# Example: reset to earliest for a topic
docker exec maaxly-kafka bash -lc "kafka-consumer-groups --bootstrap-server kafka:29092 --group chat-consumer-group --topic chat-messages --reset-offsets --to-earliest --execute"
```

## Backups: messages, topic configs, and group offsets

We use `kcat` for message export/import and Kafka CLI for configs/offsets. Backups land in `./backups/`.

### Prepare

```pwsh
New-Item -ItemType Directory -Force -Path .\backups | Out-Null
$topics = (docker exec maaxly-kafka bash -lc "kafka-topics --bootstrap-server kafka:29092 --list") -split "`n" | Where-Object { $_ -and -not $_.StartsWith('_') }
$topics
```

### Export messages (value-only JSONL)

Best for restores when values are JSON.

```pwsh
foreach ($t in $topics) {
  docker run --rm --network eomaugust31_default ghcr.io/edenhill/kcat:1.7.1 -b maaxly-kafka:29092 -t $t -C -o beginning -e > "backups/$($t).value-only.jsonl"
}
```

### Export with metadata (audit/reference)

Format: `topic|partition|offset|timestamp|key|value`

```pwsh
foreach ($t in $topics) {
  docker run --rm --network eomaugust31_default ghcr.io/edenhill/kcat:1.7.1 -b maaxly-kafka:29092 -t $t -C -o beginning -e -f '%t|%p|%o|%T|%k|%s\n' > "backups/$($t).meta.tsv"
}
```

### Export topic configs and consumer groups

```pwsh
# Topic configs
docker exec maaxly-kafka bash -lc "kafka-configs --bootstrap-server kafka:29092 --entity-type topics --all --describe" | Out-File -Encoding utf8 "backups/topic-configs.txt"

# Consumer groups
docker exec maaxly-kafka bash -lc "kafka-consumer-groups --bootstrap-server kafka:29092 --list" | Out-File -Encoding utf8 "backups/consumer-groups.txt"

# Group offsets
$groups = Get-Content "backups/consumer-groups.txt" | Where-Object { $_ -and -not $_.StartsWith('_') }
foreach ($g in $groups) {
  docker exec maaxly-kafka bash -lc "kafka-consumer-groups --bootstrap-server kafka:29092 --group $g --describe" | Out-File -Encoding utf8 "backups/consumer-group-$($g)-offsets.txt"
}
```

### Restore messages

- Single topic from value-only backup:

```pwsh
Get-Content "backups\chat-messages.value-only.jsonl" | docker run --rm -i --network eomaugust31_default ghcr.io/edenhill/kcat:1.7.1 -b maaxly-kafka:29092 -t chat-messages -P
```

- All topics (value-only):

```pwsh
foreach ($t in $topics) {
  $file = "backups/$($t).value-only.jsonl"
  if (Test-Path $file) {
    Get-Content $file | docker run --rm -i --network eomaugust31_default ghcr.io/edenhill/kcat:1.7.1 -b maaxly-kafka:29092 -t $t -P
  }
}
```

- Preserve keys: export with `-K '|' -D '|'` and restore with `-K '|'`. Ask us to wire this if needed.

### Optional: Snapshot the Kafka volume

For a coarse snapshot of the Kafka data volume. Stop the Kafka container first to avoid inconsistent snapshots:

```pwsh
docker stop maaxly-kafka
$ts = Get-Date -Format yyyyMMddHHmmss
docker run --rm -v eomaugust31_kafka_data:/data alpine sh -lc "tar -C /data -czf - ." > "backups/kafka-data-$ts.tgz"
docker start maaxly-kafka
```

Note: Restoring a raw data snapshot across different Kafka versions or cluster IDs is not recommended. Prefer message-level backups for portability.

## Best practices (local/dev focus)

- Broker endpoints:
  - Host apps use `localhost:9092`
  - Containers use `kafka:29092`
- Topics:
  - Choose partitions based on expected throughput; messages with the same key go to the same partition, preserving order.
  - Avoid decreasing partitions; increasing changes key→partition mapping for new messages.
  - For chat-like streams, prefer retention-based cleanup; compaction generally suits key-latest topics.
- Producers:
  - Include an application-level `messageId` for idempotency (your consumer already handles this for de-dup).
  - Batch sends where possible for throughput.
- Consumers:
  - Handle retries with backoff; avoid blocking `eachMessage` for long I/O (offload to async work if heavy).
  - Monitor lag in Kafka UI regularly.
- Reliability knobs (optional):
  - Set topic replication factor >1 in real clusters (local stays 1).
  - Use a dead-letter topic pattern for poison messages.
- Operations:
  - Keep regular JSONL value-only backups for quick replays.
  - Snapshot configs and group offsets before major changes.
  - Document topic contracts (schemas) alongside code.
- Docker:
  - Persist volumes (`kafka_data`, `redis_data`).
  - Remove `version:` from compose to silence warnings on Compose v2.

## Troubleshooting

- Port already in use: stop conflicting services or change published ports in the compose file.
- Can’t connect from host: check `KAFKA_ADVERTISED_LISTENERS` includes `PLAINTEXT_HOST://localhost:9092`.
- UI can’t see topics: ensure UI points to `kafka:29092` and is on the same Docker network.
- Windows path issues: keep backups under the project folder to avoid Docker Desktop file-sharing prompts.

## Environment reference

- Kafka (server):
  - `KAFKA_BROKERS` (comma-separated) or `KAFKA_BROKER` (single)
  - Defaults to `localhost:9092` in `server/kafka/*.js`
- Redis:
  - `REDIS_URL` (default `redis://localhost:6379`) in `server/redis/client.js`

---

If you want this guide automated, we can add `scripts/kafka-backup.ps1` and `scripts/kafka-restore.ps1` using the commands above.
