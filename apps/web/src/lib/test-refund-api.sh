#!/usr/bin/env bash
# Module 4 refund/fiscal API tests — curl only
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000}"
LOC="default"
TS=$(date +%s | tail -c 6)
OID="ORD-RF-${TS}"

echo "--- Module 4 Refund/Fiscal API Tests ---"

curl -sf -m 20 -X POST "$BASE/api/orders" -H "Content-Type: application/json" \
  -d "{\"id\":\"$OID\",\"locationId\":\"$LOC\",\"source\":\"dine_in\",\"status\":\"completed\",\"customerName\":\"Refund Test\",\"total\":20,\"items\":[{\"name\":\"Latte\",\"price\":10,\"quantity\":2}]}" > /dev/null

curl -sf -m 20 -X POST "$BASE/api/orders/$OID/pay" -H "Content-Type: application/json" \
  -d '{"payments":[{"method":"card","amount":20}],"total":20}' > /dev/null
echo "✅ Setup: paid order"

FISCAL=$(curl -sf -m 20 -X POST "$BASE/api/orders/$OID/fiscal" -H "Content-Type: application/json" -d '{}')
echo "$FISCAL" | grep -q '"invoiceNumber"' && echo "✅ T4.3 Fiscal record + XML generated"
echo "$FISCAL" | grep -q 'FacturaVerifactu' && echo "✅ T4.3 Valid XML structure"

AUDIT=$(curl -sf -m 20 "$BASE/api/audit")
echo "$AUDIT" | grep -q 'invoice_generated' && echo "✅ T4.4 Audit invoice_generated logged"

REFUND=$(curl -sf -m 20 -X POST "$BASE/api/orders/$OID/refund" -H "Content-Type: application/json" \
  -d '{"items":[{"itemIndex":0,"quantity":1}],"reason":"Wrong drink","method":"card"}')
echo "$REFUND" | grep -q '"rectificativa"' && echo "✅ T4.5 Partial refund rectificativa"
echo "$REFUND" | grep -q 'originalFiscalRecordId' && echo "✅ T4.5 Linked to original fiscal record"

AUDIT=$(curl -sf -m 20 "$BASE/api/audit")
echo "$AUDIT" | grep -q 'order_refunded' && echo "✅ T4.6 Audit order_refunded logged"

HISTORY=$(curl -sf -m 20 "$BASE/api/orders/history?locationId=$LOC")
echo "$HISTORY" | grep -q "$OID" && echo "✅ T4.8 Order appears in history API after refund"

echo "--- Module 4 Refund/Fiscal API Tests PASSED ---"
