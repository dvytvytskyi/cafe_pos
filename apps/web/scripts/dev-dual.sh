#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

lsof -ti :3002 | xargs kill -9 2>/dev/null || true
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
sleep 1

echo "Starting admin (full web) on http://localhost:3002"
npm run dev:admin &
ADMIN_PID=$!

echo "Starting POS shell on http://localhost:3001"
npm run dev:pos &
POS_PID=$!

cleanup() {
  kill "$ADMIN_PID" "$POS_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait
