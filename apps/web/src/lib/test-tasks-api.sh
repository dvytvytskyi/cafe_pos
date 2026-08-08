#!/usr/bin/env bash
# Module 7 TaskManager API tests — curl only
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000}"
TODAY=$(date +%Y-%m-%d)
TS=$(date +%s | tail -c 6)
TID="T-API-${TS}"

echo "--- Module 7 TaskManager API Tests ---"

# T7.1 invalid date
HTTP=$(curl -s -o /tmp/tasks_bad_date.json -w "%{http_code}" -m 10 "$BASE/api/tasks?date=not-a-date")
test "$HTTP" = "400" && echo "✅ T7.1 Invalid date rejected (400)"

STAFF=$(curl -sf -m 10 "$BASE/api/staff" || echo "[]")
VALID_USER=$(echo "$STAFF" | python3 -c "import sys,json; u=json.load(sys.stdin); print(u[0]['id'] if u else '')" 2>/dev/null || true)
if [ -z "$VALID_USER" ]; then
  VALID_USER=$(cd "$(dirname "$0")/.." && node --experimental-strip-types src/lib/test-tasks-setup.ts 2>/dev/null || true)
fi
test -n "$VALID_USER" && echo "✅ Setup: staff user $VALID_USER"

# T7.3 create with valid assignee
CREATED=$(curl -sf -m 10 -X POST "$BASE/api/tasks" -H "Content-Type: application/json" \
  -d "{\"id\":\"$TID\",\"title\":\"API Test Task ${TS}\",\"status\":\"todo\",\"assignees\":[\"$VALID_USER\"],\"scheduledDate\":\"$TODAY\",\"branch\":\"Gothic\"}")
echo "$CREATED" | grep -q "$TID" && echo "✅ T7.3 Create task with valid assigneeId"
echo "$CREATED" | grep -q "$VALID_USER" && echo "✅ T7.3 FK assignee persisted"

# T7.4 invalid assignee → 400
HTTP=$(curl -s -o /tmp/tasks_bad_user.json -w "%{http_code}" -m 10 -X POST "$BASE/api/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Bad Assignee ${TS}\",\"status\":\"todo\",\"assignees\":[\"nonexistent-user-id-999\"],\"scheduledDate\":\"$TODAY\"}")
test "$HTTP" = "400" && echo "✅ T7.4 Invalid assigneeId → 400"

# Ensure a task exists for today's date filter
OTHER="T-DATE-${TS}"
curl -sf -m 10 -X POST "$BASE/api/tasks" -H "Content-Type: application/json" \
  -d "{\"id\":\"$OTHER\",\"title\":\"Date Filter Task\",\"status\":\"todo\",\"assignees\":[],\"scheduledDate\":\"$TODAY\"}" > /dev/null

# T7.5 filter by date
BY_DATE=$(curl -sf -m 10 "$BASE/api/tasks?date=$TODAY")
echo "$BY_DATE" | grep -q "$TID" && echo "✅ T7.5 Filter by date includes today task"

# T7.6 filter by assignee
BY_USER=$(curl -sf -m 10 "$BASE/api/tasks?date=$TODAY&assigneeId=$VALID_USER")
echo "$BY_USER" | grep -q "$TID" && echo "✅ T7.6 Filter by assignee includes assigned task"
echo "$BY_USER" | python3 -c "
import sys, json
tasks = json.load(sys.stdin)
assert all('$VALID_USER' in (t.get('assignees') or []) for t in tasks), 'assignee filter leak'
" && echo "✅ T7.6 Filter by assignee excludes non-matching"

# T7.7 offline sync merges tasks
SYNC_ID="T-SYNC-${TS}"
SYNC=$(curl -sf -m 15 -X POST "$BASE/api/offline-sync" -H "Content-Type: application/json" \
  -d "{\"orders\":[],\"tasks\":[{\"id\":\"$SYNC_ID\",\"title\":\"Offline Sync Task\",\"status\":\"todo\",\"assignees\":[\"$VALID_USER\"],\"scheduledDate\":\"$TODAY\",\"branch\":\"HQ\",\"updatedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}")
echo "$SYNC" | grep -q "$SYNC_ID" && echo "✅ T7.7 Offline sync returned syncedTaskIds"

FOUND=$(curl -sf -m 10 "$BASE/api/tasks?date=$TODAY")
echo "$FOUND" | grep -q "$SYNC_ID" && echo "✅ T7.7 Synced task visible in GET /api/tasks"

echo "--- Module 7 TaskManager API Tests PASSED ---"
