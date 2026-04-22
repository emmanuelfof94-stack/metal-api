#!/bin/sh
set -e

echo "=== Node version: $(node --version) ==="
echo "=== Checking dist/ ==="
ls dist/ | head -5 || echo "dist/ not found!"

echo "=== Running Prisma migrations ==="
npx prisma migrate deploy

echo "=== Starting NestJS application ==="
exec node dist/main
