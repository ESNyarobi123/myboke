#!/usr/bin/env bash
# MyBoke — E2E runner
# Inawasha API, inaendesha suite kamili, kisha inazima.
#
#   ./scripts/e2e.sh            # build + seed + run
#   ./scripts/e2e.sh --no-build # tumia dist iliyopo
set -euo pipefail

cd "$(dirname "$0")/.."

NO_BUILD=0
for arg in "$@"; do
  [ "$arg" = "--no-build" ] && NO_BUILD=1
done

export NODE_ENV="${NODE_ENV:-development}"
export SNIPPE_WEBHOOK_SECRET="${SNIPPE_WEBHOOK_SECRET:-e2e-webhook-secret}"
export SEED_PASSWORD="${SEED_PASSWORD:-MyBoke@2026}"
export SEED_ADMIN_PHONE="${SEED_ADMIN_PHONE:-0700000001}"
export SEED_PARTNER_PHONE="${SEED_PARTNER_PHONE:-0700000002}"
export E2E_BASE="${E2E_BASE:-http://localhost:${PORT:-4000}/v1}"
# Cron za usiku zisigongane na suite (job tests zinatumia trigger ya admin).
export JOBS_ENABLED="${JOBS_ENABLED:-false}"

echo "→ seed (plans, super admin, partner)"
pnpm exec tsx prisma/seed.ts

if [ "$NO_BUILD" -eq 0 ]; then
  echo "→ build"
  pnpm exec nest build >/dev/null
fi

echo "→ start API"
node dist/main.js > /tmp/myboke-e2e.log 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

for _ in $(seq 1 90); do
  if curl -sf "http://localhost:${PORT:-4000}/v1/health" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "✗ API imekufa wakati wa kuwasha:"
    tail -40 /tmp/myboke-e2e.log
    exit 1
  fi
  sleep 0.5
done

if ! curl -sf "http://localhost:${PORT:-4000}/v1/health" >/dev/null 2>&1; then
  echo "✗ API haikujibu baada ya 45s:"
  tail -40 /tmp/myboke-e2e.log
  exit 1
fi

echo "→ run suite"
set +e
node test/e2e/api.e2e.mjs
STATUS=$?
set -e

if [ "$STATUS" -ne 0 ]; then
  echo
  echo "→ server errors (500/Exceptions):"
  grep -E "ERROR|Error:|Exception" /tmp/myboke-e2e.log | tail -30 || true
fi

exit "$STATUS"
