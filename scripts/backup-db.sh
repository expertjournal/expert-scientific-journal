#!/usr/bin/env bash
# Automated PostgreSQL Backup Script for Expert Scientific Publishing Platform

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/expert_db_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Starting PostgreSQL database backup at $(date)..."

# Dump database from docker container or environment DATABASE_URL
if command -v docker > /dev/null && docker ps | grep -q "expert_publishment1-postgres"; then
  docker exec -t $(docker ps -q -f name=postgres) pg_dump -U expert expert | gzip > "${BACKUP_FILE}"
else
  pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"
fi

echo "Database backup completed successfully: ${BACKUP_FILE}"
