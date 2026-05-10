#!/bin/bash
# Bootstrap script for SQL Server. The official mcr.microsoft.com/mssql/server
# image has no /docker-entrypoint-initdb.d convention, so we layer this on:
#
#   1. Launch sqlservr in the background.
#   2. Poll sqlcmd until SELECT 1 succeeds (engine has accepted connections).
#   3. Run the seed once (sentinel file in /var/opt/mssql/.seeded prevents
#      re-seeding on container restart).
#   4. Hand the foreground process back to sqlservr so the container's
#      lifecycle stays normal.

set -euo pipefail

SENTINEL=/var/opt/mssql/.seeded
SEED_FILE=/init/01-init.sql
SA_PASSWORD="${MSSQL_SA_PASSWORD:?MSSQL_SA_PASSWORD must be set}"

# Tools changed paths across image versions; prefer the modern one with
# fallback to the legacy path so this works on both 2022 and earlier.
if [ -x /opt/mssql-tools18/bin/sqlcmd ]; then
  SQLCMD=/opt/mssql-tools18/bin/sqlcmd
  SQLCMD_FLAGS="-No"  # trust self-signed cert
else
  SQLCMD=/opt/mssql-tools/bin/sqlcmd
  SQLCMD_FLAGS=""
fi

# Launch the engine in the background.
/opt/mssql/bin/sqlservr &
SQLSERVR_PID=$!

# Poll up to ~3 minutes for the engine to accept connections.
echo "[entrypoint-init] waiting for SQL Server to accept connections..."
for i in $(seq 1 60); do
  if "$SQLCMD" -S localhost -U sa -P "$SA_PASSWORD" $SQLCMD_FLAGS -Q 'SELECT 1' -t 5 >/dev/null 2>&1; then
    echo "[entrypoint-init] SQL Server is ready (after ${i} attempts)"
    break
  fi
  sleep 3
done

if [ ! -f "$SENTINEL" ]; then
  echo "[entrypoint-init] running first-time seed..."
  "$SQLCMD" -S localhost -U sa -P "$SA_PASSWORD" $SQLCMD_FLAGS -i "$SEED_FILE"
  echo "[entrypoint-init] seed complete; writing sentinel"
  touch "$SENTINEL"
else
  echo "[entrypoint-init] sentinel present, skipping seed"
fi

# Hand back to sqlservr -- this becomes PID 1's child but `wait` keeps the
# container running for the engine's lifetime.
wait $SQLSERVR_PID
