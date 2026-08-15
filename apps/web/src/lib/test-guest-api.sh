#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
LOC="${LOCATION_ID:-default}"

echo "=== Guest API smoke test ==="

BOOT=$(curl -s "${BASE}/api/guest/bootstrap?locationId=${LOC}")
echo "$BOOT" | grep -q '"locationId"' && echo "✅ bootstrap"

MENU=$(curl -s "${BASE}/api/guest/menu?locationId=${LOC}&locale=en")
echo "$MENU" | grep -q '"items"' && echo "✅ menu"

MERCH=$(curl -s "${BASE}/api/guest/merch?locationId=${LOC}")
echo "$MERCH" | grep -q '"items"' && echo "✅ merch catalog"

PHONE="+34600008888"
OTP_REQ=$(curl -s -X POST "${BASE}/api/guest/auth/otp/request" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${PHONE}\"}")
echo "$OTP_REQ" | grep -q '"sent"' && echo "✅ otp request"

CODE=$(echo "$OTP_REQ" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.devCode||'')})")
if [ -z "$CODE" ]; then
  echo "⚠️  devCode not returned (production mode?) — skipping auth-dependent checks"
  exit 0
fi

COOKIE_JAR=$(mktemp)
curl -s -c "$COOKIE_JAR" -X POST "${BASE}/api/guest/auth/otp/verify" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${PHONE}\",\"code\":\"${CODE}\"}" | grep -q '"ok"' && echo "✅ otp verify"

curl -s -b "$COOKIE_JAR" "${BASE}/api/guest/me" | grep -q '"phone"' && echo "✅ me profile"

ORDER=$(curl -s -b "$COOKIE_JAR" -X POST "${BASE}/api/guest/orders" \
  -H 'Content-Type: application/json' \
  -d "{\"locationId\":\"${LOC}\",\"items\":[{\"itemType\":\"food\",\"name\":\"API Latte\",\"quantity\":1,\"unitPrice\":3.5}]}")
echo "$ORDER" | grep -q 'guest_emenu' && echo "✅ create order"

rm -f "$COOKIE_JAR"
echo "=== Guest API smoke test complete ==="
