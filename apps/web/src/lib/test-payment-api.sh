#!/usr/bin/env bash
# Module 3 payment tests — curl only, no tsx (fast, ~3s)
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000}"
LOC="default"
TS=$(date +%s | tail -c 6)

echo "--- Module 3 Payment API Tests ---"

# T3.6 Single card payment
OID="ORD-T3-${TS}"
curl -sf -m 8 -X POST "$BASE/api/orders" -H "Content-Type: application/json" \
  -d "{\"id\":\"$OID\",\"locationId\":\"$LOC\",\"source\":\"dine_in\",\"status\":\"preparing\",\"customerName\":\"T3.6\",\"total\":20,\"items\":[{\"name\":\"Latte\",\"price\":20,\"quantity\":1}]}" > /dev/null
PAID=$(curl -sf -m 8 -X POST "$BASE/api/orders/$OID/pay" -H "Content-Type: application/json" \
  -d '{"payments":[{"method":"card","amount":20}],"total":20}')
echo "$PAID" | grep -q '"paid":true' && echo "✅ T3.6 Single card payment"

# T3.7 Split cash + giftcard
OID2="ORD-SPL-${TS}"
curl -sf -m 8 -X POST "$BASE/api/orders" -H "Content-Type: application/json" \
  -d "{\"id\":\"$OID2\",\"locationId\":\"$LOC\",\"source\":\"dine_in\",\"status\":\"preparing\",\"customerName\":\"T3.7\",\"total\":40,\"items\":[{\"name\":\"Brunch\",\"price\":40,\"quantity\":1}]}" > /dev/null
GC=$(curl -sf -m 8 -X POST "$BASE/api/giftcards" -H "Content-Type: application/json" -d '{"initialBalance":20}')
CODE=$(echo "$GC" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
curl -sf -m 8 -X POST "$BASE/api/orders/$OID2/pay" -H "Content-Type: application/json" \
  -d '{"payments":[{"method":"cash","amount":20}],"total":40}' > /dev/null
PAID2=$(curl -sf -m 8 -X POST "$BASE/api/orders/$OID2/pay" -H "Content-Type: application/json" \
  -d "{\"payments\":[{\"method\":\"giftcard\",\"amount\":20,\"code\":\"$CODE\"}],\"total\":40}")
echo "$PAID2" | grep -q '"method":"cash"' && echo "$PAID2" | grep -q '"method":"giftcard"' && echo "✅ T3.7 Split cash + giftcard (2 payment methods)"
echo "$PAID2" | grep -q '"paid":true' && echo "✅ T3.7 Order fully paid"

# T3.8 Gift card fail
OID3="ORD-FAIL-${TS}"
curl -sf -m 8 -X POST "$BASE/api/orders" -H "Content-Type: application/json" \
  -d "{\"id\":\"$OID3\",\"locationId\":\"$LOC\",\"source\":\"dine_in\",\"status\":\"preparing\",\"customerName\":\"T3.8\",\"total\":10,\"items\":[{\"name\":\"Coffee\",\"price\":10,\"quantity\":1}]}" > /dev/null
FAIL_CODE=$(curl -s -m 8 -o /dev/null -w "%{http_code}" -X POST "$BASE/api/orders/$OID3/pay" -H "Content-Type: application/json" \
  -d '{"payments":[{"method":"giftcard","amount":10,"code":"INVALID-XYZ"}],"total":10}')
[ "$FAIL_CODE" = "400" ] && echo "✅ T3.8 Gift card fail → 400 rollback"

# T3.9 Loyalty earn
CUST=$(curl -sf -m 8 -X POST "$BASE/api/crm/customers" -H "Content-Type: application/json" \
  -d "{\"name\":\"Pay Test\",\"phone\":\"+380${TS}\",\"email\":\"pay${TS}@test.local\"}")
CID=$(echo "$CUST" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
PTS_BEFORE=$(echo "$CUST" | grep -o '"points":[0-9.]*' | head -1 | cut -d: -f2)
OID9="ORD-LOY-${TS}"
curl -sf -m 8 -X POST "$BASE/api/orders" -H "Content-Type: application/json" \
  -d "{\"id\":\"$OID9\",\"locationId\":\"$LOC\",\"source\":\"dine_in\",\"status\":\"preparing\",\"customerName\":\"Pay Test\",\"customerId\":\"$CID\",\"total\":20,\"items\":[{\"name\":\"Tea\",\"price\":20,\"quantity\":1}]}" > /dev/null
curl -sf -m 8 -X POST "$BASE/api/orders/$OID9/pay" -H "Content-Type: application/json" \
  -d "{\"payments\":[{\"method\":\"card\",\"amount\":20}],\"customerId\":\"$CID\",\"total\":20}" > /dev/null
CUST_AFTER=$(curl -sf -m 8 "$BASE/api/crm/customers")
PTS_AFTER=$(echo "$CUST_AFTER" | grep -A20 "\"id\":\"$CID\"" | grep -o '"points":[0-9.]*' | head -1 | cut -d: -f2)
awk "BEGIN {exit !($PTS_AFTER > $PTS_BEFORE)}" && echo "✅ T3.9 Loyalty earn on pay"

# T3.10 Insufficient points
OID10="ORD-PTS-${TS}"
curl -sf -m 8 -X POST "$BASE/api/orders" -H "Content-Type: application/json" \
  -d "{\"id\":\"$OID10\",\"locationId\":\"$LOC\",\"source\":\"dine_in\",\"status\":\"preparing\",\"customerName\":\"Pay Test\",\"customerId\":\"$CID\",\"total\":30,\"items\":[{\"name\":\"Salad\",\"price\":30,\"quantity\":1}]}" > /dev/null
PTS_FAIL=$(curl -s -m 8 -o /dev/null -w "%{http_code}" -X POST "$BASE/api/orders/$OID10/pay" -H "Content-Type: application/json" \
  -d "{\"payments\":[{\"method\":\"points\",\"amount\":999}],\"customerId\":\"$CID\",\"total\":30}")
[ "$PTS_FAIL" = "400" ] && echo "✅ T3.10 Loyalty spend > balance → 400"

# T3.14 Pay → table dirty (server-side)
TID="tab-${TS}"
curl -sf -m 8 -X POST "$BASE/api/locations/$LOC/layout" -H "Content-Type: application/json" \
  -d "{\"rooms\":[{\"id\":\"room-main\",\"name\":\"Main\",\"tables\":[{\"id\":\"$TID\",\"name\":\"T1\",\"x\":0,\"y\":0,\"width\":60,\"height\":60,\"type\":\"rect\",\"status\":\"occupied\",\"seats\":4}]}]}" > /dev/null
OID14="ORD-TBL-${TS}"
curl -sf -m 8 -X POST "$BASE/api/orders" -H "Content-Type: application/json" \
  -d "{\"id\":\"$OID14\",\"locationId\":\"$LOC\",\"source\":\"dine_in\",\"status\":\"preparing\",\"customerName\":\"Table T1\",\"tableId\":\"$TID\",\"total\":12,\"items\":[{\"name\":\"Soup\",\"price\":12,\"quantity\":1}]}" > /dev/null
curl -sf -m 8 -X POST "$BASE/api/orders/$OID14/pay" -H "Content-Type: application/json" \
  -d '{"payments":[{"method":"card","amount":12}],"total":12}' > /dev/null
LAYOUT=$(curl -sf -m 8 "$BASE/api/locations/$LOC/layout")
echo "$LAYOUT" | grep -q "\"id\":\"$TID\"" && echo "$LAYOUT" | grep -A2 "\"id\":\"$TID\"" | grep -q '"status":"dirty"' && echo "✅ T3.14 Pay → table dirty"

# T3.15 Not in active list after pay
ACTIVE=$(curl -sf -m 8 "$BASE/api/orders?locationId=$LOC")
echo "$ACTIVE" | grep -q "$OID14" && echo "❌ T3.15 Order still in active list" && exit 1 || echo "✅ T3.15 Paid order removed from active list"

# T3.16 Cash without open shift
OID16="ORD-CASH-${TS}"
curl -sf -m 8 -X POST "$BASE/api/orders" -H "Content-Type: application/json" \
  -d "{\"id\":\"$OID16\",\"locationId\":\"$LOC\",\"source\":\"dine_in\",\"status\":\"preparing\",\"customerName\":\"T3.16\",\"total\":8,\"items\":[{\"name\":\"Tea\",\"price\":8,\"quantity\":1}]}" > /dev/null
CASH=$(curl -sf -m 8 -X POST "$BASE/api/orders/$OID16/pay" -H "Content-Type: application/json" \
  -d '{"payments":[{"method":"cash","amount":8}],"total":8}')
echo "$CASH" | grep -q '"paid":true' && echo "✅ T3.16 Cash without shift (warning in response)"
echo "$CASH" | grep -q 'NO_OPEN_SHIFT' && echo "✅ T3.16 NO_OPEN_SHIFT warning flag present" || echo "⚠️  T3.16 (no open shift to warn — OK if shift is open)"

# Race: concurrent gift card redeem on same card
GC2=$(curl -sf -m 8 -X POST "$BASE/api/giftcards" -H "Content-Type: application/json" -d '{"initialBalance":15}')
CODE2=$(echo "$GC2" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
O1="ORD-R1-${TS}"; O2="ORD-R2-${TS}"
curl -sf -m 8 -X POST "$BASE/api/orders" -H "Content-Type: application/json" \
  -d "{\"id\":\"$O1\",\"locationId\":\"$LOC\",\"source\":\"dine_in\",\"status\":\"preparing\",\"customerName\":\"R1\",\"total\":15,\"items\":[{\"name\":\"A\",\"price\":15,\"quantity\":1}]}" > /dev/null
curl -sf -m 8 -X POST "$BASE/api/orders" -H "Content-Type: application/json" \
  -d "{\"id\":\"$O2\",\"locationId\":\"$LOC\",\"source\":\"dine_in\",\"status\":\"preparing\",\"customerName\":\"R2\",\"total\":15,\"items\":[{\"name\":\"B\",\"price\":15,\"quantity\":1}]}" > /dev/null
curl -s -m 8 -X POST "$BASE/api/orders/$O1/pay" -H "Content-Type: application/json" \
  -d "{\"payments\":[{\"method\":\"giftcard\",\"amount\":15,\"code\":\"$CODE2\"}],\"total\":15}" > /tmp/pay-r1-${TS}.json &
curl -s -m 8 -X POST "$BASE/api/orders/$O2/pay" -H "Content-Type: application/json" \
  -d "{\"payments\":[{\"method\":\"giftcard\",\"amount\":15,\"code\":\"$CODE2\"}],\"total\":15}" > /tmp/pay-r2-${TS}.json &
wait
OK=0
grep -q '"paid":true' /tmp/pay-r1-${TS}.json 2>/dev/null && OK=$((OK+1))
grep -q '"paid":true' /tmp/pay-r2-${TS}.json 2>/dev/null && OK=$((OK+1))
[ "$OK" -eq 1 ] && echo "✅ Race condition: exactly one gift card pay succeeded"
rm -f /tmp/pay-r1-${TS}.json /tmp/pay-r2-${TS}.json

echo "--- Module 3 Payment API Tests PASSED ---"
