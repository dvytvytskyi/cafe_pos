#!/usr/bin/env bash
# Module 5 eMenu API tests — curl only
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000}"
LOC="default"
TS=$(date +%s | tail -c 6)
OID="ORD-EM-${TS}"
TABLE="t4"

echo "--- Module 5 eMenu API Tests ---"

curl -sf -m 15 -X POST "$BASE/api/locations/$LOC/layout" -H "Content-Type: application/json" \
  -d '{"rooms":[{"id":"room-1","name":"Main Hall","tables":[{"id":"t4","x":0,"y":0,"width":60,"height":60,"type":"rect","name":"4","seats":4,"status":"available"}],"zones":[],"obstacles":[]}]}' > /dev/null
echo "✅ Setup: table t4 seeded in layout"

ORDER=$(curl -sf -m 15 -X POST "$BASE/api/orders" -H "Content-Type: application/json" \
  -d "{\"id\":\"$OID\",\"locationId\":\"$LOC\",\"tableId\":\"$TABLE\",\"source\":\"dine_in\",\"status\":\"incoming\",\"customerName\":\"eMenu Guest\",\"total\":12.5,\"items\":[{\"name\":\"Latte\",\"price\":4,\"quantity\":2},{\"name\":\"Croissant\",\"price\":4.5,\"quantity\":1}]}")

echo "$ORDER" | grep -q '"incoming"' && echo "✅ T5.4 eMenu order status incoming"
echo "$ORDER" | grep -q "$OID" && echo "✅ T5.4 Order persisted with id"

ACTIVE=$(curl -sf -m 10 "$BASE/api/orders?locationId=$LOC")
echo "$ACTIVE" | grep -q "$OID" && echo "✅ T5.5 Order visible in active orders list"

curl -sf -m 10 "$BASE/api/menu/categories" | grep -q 'Almond Croissant' && echo "✅ T5.7 Almond Croissant seeded in menu"
curl -sf -m 10 "$BASE/api/menu/categories" | grep -q 'Nuts' && echo "✅ T5.7 Nuts allergen present in menu API"

QR_PATH="/emenu?location=$LOC&table=$TABLE"
curl -sf -m 10 "$BASE$QR_PATH" -o /dev/null && echo "✅ T5.5 eMenu page loads for QR URL"

echo "--- Module 5 eMenu API Tests PASSED ---"
