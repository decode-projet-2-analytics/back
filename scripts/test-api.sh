#!/usr/bin/env bash
# API smoke tests — run from decode-projet-2-analytics-back/
#
# Prerequisites:
#   docker compose up -d
#   docker compose exec backend npm run d:s:u
#
# Usage:
#   bash scripts/test-api.sh

set -e

BASE="http://localhost:3008"
RUN_ID="${RUN_ID:-$(date +%s)}"
WM_EMAIL="alice-${RUN_ID}@example.com"
ADMIN_EMAIL="admin-${RUN_ID}@example.com"

# uses node (no jq required)
json() { node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0,'utf8')), null, 2)" 2>/dev/null || cat; }
json_field() { node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).$1" 2>/dev/null; }
status() { curl -s -o /dev/null -w "HTTP %{http_code}\n" "$@"; }

echo "=== 1. Health check ==="
curl -s "$BASE/" | json

echo ""
echo "=== 2. Signup webmaster (POST /users, no token) ==="
WM=$(curl -s -X POST "$BASE/users" \
  -H "Content-Type: application/json" \
  -d '{
    "lastname": "Dupont",
    "firstname": "Alice",
    "email": "'"$WM_EMAIL"'",
    "password": "Secret123!",
    "companyName": "Alice Corp",
    "contactPhone": "+33600000000",
    "websiteUrl": "https://alice-corp.example.com",
    "kbisDocument": "/uploads/kbis-alice.pdf"
  }')
echo "$WM" | json
WM_ID=$(echo "$WM" | json_field id)

echo ""
echo "=== 3. Login webmaster ==="
WM_TOKEN=$(curl -s -X POST "$BASE/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$WM_EMAIL"'", "password": "Secret123!"}' | json_field token)
echo "token: ${WM_TOKEN:0:50}..."

echo ""
echo "=== 4. GET own user (GET /users/:id) ==="
curl -s "$BASE/users/$WM_ID" \
  -H "Authorization: Bearer $WM_TOKEN" | json

echo ""
echo "=== 5. PATCH own user (role/status stripped for webmaster) ==="
curl -s -X PATCH "$BASE/users/$WM_ID" \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstname": "Alicia", "role": "Admin", "status": "validated"}' | json

echo ""
echo "=== 6. LIST users as webmaster (expect 403) ==="
status "$BASE/users" -H "Authorization: Bearer $WM_TOKEN"

echo ""
echo "=== 7. GET /users/999 as webmaster (expect 404) ==="
status "$BASE/users/999" -H "Authorization: Bearer $WM_TOKEN"

echo ""
echo "=== 8. Create + promote admin (signup + SQL) ==="
curl -s -X POST "$BASE/users" \
  -H "Content-Type: application/json" \
  -d '{
    "lastname": "Root",
    "firstname": "Admin",
    "email": "'"$ADMIN_EMAIL"'",
    "password": "Admin123!",
    "companyName": "Decode",
    "websiteUrl": "https://decode.example.com"
  }' > /dev/null

docker compose exec -T db psql -U postgres -d decode -c \
  "UPDATE \"Users\" SET role='Admin', status='validated' WHERE email='${ADMIN_EMAIL}';"

echo ""
echo "=== 9. Login admin ==="
ADMIN_TOKEN=$(curl -s -X POST "$BASE/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$ADMIN_EMAIL"'", "password": "Admin123!"}' | json_field token)
echo "token: ${ADMIN_TOKEN:0:50}..."

echo ""
echo "=== 10. LIST users as admin ==="
curl -s "$BASE/users?status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | json

echo ""
echo "=== 11. Validate webmaster (admin PATCH) ==="
curl -s -X PATCH "$BASE/users/$WM_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "validated"}' | json

echo ""
echo "=== 12. CREATE site ==="
SITE=$(curl -s -X POST "$BASE/sites" \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Shop",
    "baseUrl": "https://shop.alice-corp.example.com",
    "corsOrigins": ["https://shop.alice-corp.example.com"]
  }')
echo "$SITE" | json
SITE_ID=$(echo "$SITE" | json_field id)

echo ""
echo "=== 13. LIST sites ==="
curl -s "$BASE/sites" \
  -H "Authorization: Bearer $WM_TOKEN" | json

echo ""
echo "=== 14. CREATE tag ==="
TAG=$(curl -s -X POST "$BASE/tags" \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"comment\": \"Add to cart\", \"siteId\": $SITE_ID}")
echo "$TAG" | json
TAG_ID=$(echo "$TAG" | json_field id)

echo ""
echo "=== 15. CREATE tunnel ==="
curl -s -X POST "$BASE/tunnels" \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"comment\": \"Checkout funnel\", \"siteId\": $SITE_ID, \"tagIds\": [$TAG_ID]}" | json

echo ""
echo "=== 16. PATCH tag ==="
curl -s -X PATCH "$BASE/tags/$TAG_ID" \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Add to cart (updated)"}' | json

echo ""
echo "=== Done ==="
