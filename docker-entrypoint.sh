#!/bin/sh
set -e
if [ -z "$WORKER" ]; then
  npx prisma migrate deploy
  if [ "$RUN_SEED_ON_BOOT" = "1" ]; then
    echo "Running prisma seed because RUN_SEED_ON_BOOT=1..."
    node dist/prisma/seed.js
  fi
fi
exec "$@"
