#!/usr/bin/env bash
# Start Next.js dev server + WebSocket gateway together
set -euo pipefail
cd "$(dirname "$0")/.."

cleanup() {
  if [[ -n "${WS_PID:-}" ]]; then
    kill "$WS_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting WS gateway on :3005..."
npm run dev:ws &
WS_PID=$!
sleep 1

if ! curl -sf -m 3 http://localhost:3005 >/dev/null 2>&1; then
  echo "⚠️  WS gateway not ready yet — continuing anyway"
else
  echo "✅ WS gateway ready"
fi

echo "Starting Next.js dev server on :3000..."
npm run dev
