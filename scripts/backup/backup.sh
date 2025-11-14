#!/usr/bin/env bash
set -euo pipefail

# Interval between backups in seconds (default: 24h)
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
# Paths
BACKUP_ROOT="/backups"
MONGO_DIR="$BACKUP_ROOT/mongo"
REDIS_DIR="$BACKUP_ROOT/redis"
KAFKA_DIR="$BACKUP_ROOT/kafka"
RAW_DIR="$BACKUP_ROOT/raw"

mkdir -p "$MONGO_DIR" "$REDIS_DIR" "$KAFKA_DIR" "$RAW_DIR"

function ts() {
  date -u +%Y%m%d-%H%M%SZ
}

function backup_once() {
  local stamp
  stamp="$(ts)"
  echo "[backup] Starting backup at $stamp"

  # MongoDB logical backup (mongodump)
  echo "[backup] MongoDB dump..."
  mongodump \
    --host mongodb \
    --username "${MONGO_INITDB_ROOT_USERNAME:-maaxly}" \
    --password "${MONGO_INITDB_ROOT_PASSWORD:-maaxlypass}" \
    --authenticationDatabase admin \
    --db "${MONGODB_DB:-mvp-db}" \
    --out "$MONGO_DIR/$stamp"

  # Kafka data volume snapshot (tar)
  echo "[backup] Kafka volume archive..."
  tar -C /data/kafka -czf "$KAFKA_DIR/kafka-$stamp.tgz" . || echo "[backup] Kafka tar: warning (possibly empty)"

  # Redis data volume snapshot (tar)
  echo "[backup] Redis volume archive..."
  tar -C /data/redis -czf "$REDIS_DIR/redis-$stamp.tgz" . || echo "[backup] Redis tar: warning (possibly empty)"

  echo "[backup] Completed at $(ts)"
}

# Run once immediately, then loop
backup_once
while true; do
  sleep "$INTERVAL"
  backup_once
done
