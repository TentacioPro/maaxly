#!/bin/bash

OUTPUT="/tmp/gcp_vm_report.txt"
REPO_DIR=$(git rev-parse --show-toplevel 2>/dev/null)

echo "Gathering VM deployment information..."
echo "Saving to $OUTPUT"
echo "----------------------------------------" > "$OUTPUT"

{
echo "========================================"
echo "🌐 VM INFO"
echo "========================================"
echo "External IP:"
curl -s ifconfig.me
echo
echo "Internal IP:"
hostname -I
echo
echo "Hostname:"
hostname
echo
echo "Current User:"
whoami
echo

echo "========================================"
echo "🔑 SSH INFO"
echo "========================================"
echo "~/.ssh directory contents:"
ls -al ~/.ssh
echo
echo "authorized_keys:"
cat ~/.ssh/authorized_keys 2>/dev/null
echo

echo "========================================"
echo "📁 REPOSITORY INFO"
echo "========================================"
if [ -z "$REPO_DIR" ]; then
  echo "No git repository detected in current directory."
else
  echo "Repo top-level directory: $REPO_DIR"
  echo "Current branch:"
  git -C "$REPO_DIR" branch --show-current
  echo
  echo "Git remote -v:"
  git -C "$REPO_DIR" remote -v
  echo
  echo ".gitignore:"
  cat "$REPO_DIR/.gitignore" 2>/dev/null
fi
echo

echo "========================================"
echo "🔐 ENV FILES"
echo "========================================"
if [ -n "$REPO_DIR" ]; then
  echo "$REPO_DIR/.env.prod:"
  cat "$REPO_DIR/.env.prod" 2>/dev/null
  echo
else
  echo "No repo detected → skipping env file scan."
fi
echo

echo "========================================"
echo "🐳 DOCKER INFO"
echo "========================================"
echo "Docker version:"
docker --version
echo
echo "Docker Compose version:"
docker compose version 2>/dev/null || docker-compose --version 2>/dev/null
echo
echo "User groups:"
groups $(whoami)
echo
echo "Docker ps:"
docker ps
echo

echo "========================================"
echo "🧩 DOCKER COMPOSE FILE"
echo "========================================"
if [ -n "$REPO_DIR" ]; then
  echo "$REPO_DIR/docker-compose.yml:"
  cat "$REPO_DIR/docker-compose.yml" 2>/dev/null
else
  echo "No repo detected → skipping docker-compose file."
fi
echo

echo "========================================"
echo "🚀 RUNNING CONTAINERS (docker compose ps)"
echo "========================================"
docker compose ps 2>/dev/null || echo "docker compose ps not available"
echo

echo "========================================"
echo "📝 LAST 50 LINES OF DOCKER LOGS"
echo "========================================"
docker compose logs --tail 50 2>/dev/null || echo "No docker compose logs available"
echo

} >> "$OUTPUT"

echo "----------------------------------------"
echo "Done. Output written to: $OUTPUT"
echo "----------------------------------------"

echo
echo "======= REPORT START ======="
cat "$OUTPUT"
echo "======= REPORT END ======="
