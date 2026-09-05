#!/bin/sh
set -e
if [ -z "$WORKER" ]; then
  npx prisma migrate deploy
  node dist/prisma/seed.js
fi
exec "$@"
