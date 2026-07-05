#!/usr/bin/env bash
# API smoke tests - run from back/
#
# Prerequisites:
#   docker compose up -d
#   docker compose exec backend npm run d:s:u
#
# Usage:
#   bash scripts/test-api.sh
#
# Routes under /api/v1/ (see back/README.md, back-taches.md Phase 1)

set -e

BASE="http://localhost:3008"
API="$BASE/api/v1"
RUN_ID="${RUN_ID:-$(date +%s)}"
WM_EMAIL="alice-${RUN_ID}@example.com"
ADMIN_EMAIL="admin-${RUN_ID}@example.com"

# uses node (no jq required)
json() { node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0,'utf8')), null, 2)" 2>/dev/null || cat; }
json_field() { node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).$1" 2>/dev/null; }
status() { curl -s -o /dev/null -w "HTTP %{http_code}\n" "$@"; }
expect_status() {
  local expected=$1
  shift
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" "$@")
  if [ "$actual" != "$expected" ]; then
    echo "FAIL: expected HTTP $expected, got $actual"
    exit 1
  fi
  echo "HTTP $actual (ok)"
}
assert_owner_id() {
  local payload="$1"
  local expected="$2"
  EXPECTED="$expected" node -e "
    const o = JSON.parse(require('fs').readFileSync(0,'utf8'));
    if (String(o.ownerId) !== String(process.env.EXPECTED)) {
      console.error('FAIL: ownerId=' + o.ownerId + ', expected ' + process.env.EXPECTED);
      process.exit(1);
    }
    console.log('ownerId=' + o.ownerId + ' (ok)');
  " <<< "$payload"
}
assert_no_field() {
  local payload="$1"
  local field="$2"
  FIELD="$field" node -e "
    const o = JSON.parse(require('fs').readFileSync(0,'utf8'));
    if (Object.prototype.hasOwnProperty.call(o, process.env.FIELD)) {
      console.error('FAIL: field \"' + process.env.FIELD + '\" should not be present');
      process.exit(1);
    }
    console.log('no ' + process.env.FIELD + ' in response (ok)');
  " <<< "$payload"
}
assert_list_count() {
  local payload="$1"
  local expected="$2"
  EXPECTED="$expected" node -e "
    const items = JSON.parse(require('fs').readFileSync(0,'utf8'));
    if (!Array.isArray(items) || items.length !== Number(process.env.EXPECTED)) {
      console.error('FAIL: expected ' + process.env.EXPECTED + ' items, got ' + (Array.isArray(items) ? items.length : typeof items));
      process.exit(1);
    }
    console.log('list count ' + items.length + ' (ok)');
  " <<< "$payload"
}
assert_list_excludes_id() {
  local payload="$1"
  local id="$2"
  EXCLUDED_ID="$id" node -e "
    const items = JSON.parse(require('fs').readFileSync(0,'utf8'));
    if (!Array.isArray(items)) { console.error('FAIL: expected array'); process.exit(1); }
    if (items.some(i => String(i.id) === String(process.env.EXCLUDED_ID))) {
      console.error('FAIL: list contains id ' + process.env.EXCLUDED_ID);
      process.exit(1);
    }
    console.log('list excludes id ' + process.env.EXCLUDED_ID + ' (ok)');
  " <<< "$payload"
}

echo "=== 1. Health check ==="
curl -s "$BASE/" | json

echo ""
echo "=== 2. Signup webmaster (POST /api/v1/users, no token) ==="
WM=$(curl -s -X POST "$API/users" \
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
echo "=== 3. Create + promote admin (signup + SQL) ==="
curl -s -X POST "$API/users" \
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
echo "=== 4. Login admin ==="
ADMIN_TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$ADMIN_EMAIL"'", "password": "Admin123!"}' | json_field token)
echo "token: ${ADMIN_TOKEN:0:50}..."

echo ""
echo "=== 5. LIST users as admin (pending) ==="
curl -s "$API/users?status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | json

echo ""
echo "=== 6. Validate webmaster (admin PATCH) ==="
curl -s -X PATCH "$API/users/$WM_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "validated"}' | json

echo ""
echo "=== 7. Login webmaster ==="
WM_TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$WM_EMAIL"'", "password": "Secret123!"}' | json_field token)
echo "token: ${WM_TOKEN:0:50}..."

echo ""
echo "=== 8. GET own user (GET /api/v1/users/:id) ==="
curl -s "$API/users/$WM_ID" \
  -H "Authorization: Bearer $WM_TOKEN" | json

echo ""
echo "=== 9. PATCH own user (role/status stripped for webmaster) ==="
curl -s -X PATCH "$API/users/$WM_ID" \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstname": "Alicia", "role": "Admin", "status": "validated"}' | json

echo ""
echo "=== 10. LIST users as webmaster (expect 403) ==="
status "$API/users" -H "Authorization: Bearer $WM_TOKEN"

echo ""
echo "=== 11. GET /api/v1/users/999 as webmaster (expect 404) ==="
status "$API/users/999" -H "Authorization: Bearer $WM_TOKEN"

echo ""
echo "=== 12. CREATE application (ownerId set server-side, appSecret stripped) ==="
APP=$(curl -s -X POST "$API/applications" \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Shop",
    "allowedUrls": [
      "https://shop.alice-corp.example.com",
      "http://localhost:5173"
    ],
    "appSecret": "PlainTextSecret123!",
    "ownerId": 99999
  }')
echo "$APP" | json
APP_ID=$(echo "$APP" | json_field id)
assert_owner_id "$APP" "$WM_ID"
assert_no_field "$APP" "appSecret"

echo ""
echo "=== 13. GET own application ==="
APP_GET=$(curl -s "$API/applications/$APP_ID" \
  -H "Authorization: Bearer $WM_TOKEN")
echo "$APP_GET" | json
assert_owner_id "$APP_GET" "$WM_ID"
assert_no_field "$APP_GET" "appSecret"

echo ""
echo "=== 14. PATCH application ==="
APP_PATCHED=$(curl -s -X PATCH "$API/applications/$APP_ID" \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Shop (updated)",
    "allowedUrls": ["https://shop.alice-corp.example.com"]
  }')
echo "$APP_PATCHED" | json
echo "$APP_PATCHED" | node -e "
  const o = JSON.parse(require('fs').readFileSync(0,'utf8'));
  if (o.name !== 'Alice Shop (updated)') { console.error('FAIL: name not updated'); process.exit(1); }
  if (o.allowedUrls.length !== 1) { console.error('FAIL: allowedUrls not updated'); process.exit(1); }
  console.log('application patched (ok)');
"

echo ""
echo "=== 15. LIST applications as webmaster (only own) ==="
ALICE_APPS=$(curl -s "$API/applications" \
  -H "Authorization: Bearer $WM_TOKEN")
echo "$ALICE_APPS" | json
assert_list_count "$ALICE_APPS" 1

echo ""
echo "=== 16. Create second webmaster + application (isolation setup) ==="
BOB_EMAIL="bob-${RUN_ID}@example.com"
BOB=$(curl -s -X POST "$API/users" \
  -H "Content-Type: application/json" \
  -d '{
    "lastname": "Martin",
    "firstname": "Bob",
    "email": "'"$BOB_EMAIL"'",
    "password": "Secret123!",
    "companyName": "Bob Corp",
    "websiteUrl": "https://bob-corp.example.com"
  }')
BOB_ID=$(echo "$BOB" | json_field id)

curl -s -X PATCH "$API/users/$BOB_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "validated"}' > /dev/null

BOB_TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$BOB_EMAIL"'", "password": "Secret123!"}' | json_field token)

BOB_APP=$(curl -s -X POST "$API/applications" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob Shop", "allowedUrls": ["https://shop.bob-corp.example.com"]}')
echo "$BOB_APP" | json
BOB_APP_ID=$(echo "$BOB_APP" | json_field id)
assert_owner_id "$BOB_APP" "$BOB_ID"

echo ""
echo "=== 17. Webmaster cannot access another user's application ==="
expect_status 404 "$API/applications/$BOB_APP_ID" \
  -H "Authorization: Bearer $WM_TOKEN"

echo ""
echo "=== 18. Webmaster list excludes other users' applications ==="
ALICE_APPS=$(curl -s "$API/applications" \
  -H "Authorization: Bearer $WM_TOKEN")
assert_list_excludes_id "$ALICE_APPS" "$BOB_APP_ID"

BOB_APPS=$(curl -s "$API/applications" \
  -H "Authorization: Bearer $BOB_TOKEN")
assert_list_count "$BOB_APPS" 1
assert_list_excludes_id "$BOB_APPS" "$APP_ID"

echo ""
echo "=== 19. Admin lists all applications ==="
ADMIN_APPS=$(curl -s "$API/applications" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$ADMIN_APPS" | json
echo "$ADMIN_APPS" | APP_ID="$APP_ID" BOB_APP_ID="$BOB_APP_ID" node -e "
  const items = JSON.parse(require('fs').readFileSync(0,'utf8'));
  const ids = items.map(i => String(i.id));
  for (const id of [process.env.APP_ID, process.env.BOB_APP_ID]) {
    if (!ids.includes(String(id))) {
      console.error('FAIL: admin list missing application id ' + id);
      process.exit(1);
    }
  }
  console.log('admin sees all applications (ok)');
"

echo ""
echo "=== 20. CREATE tunnel scoped to application (before tag - tunnelId required) ==="
TUNNEL=$(curl -s -X POST "$API/tunnels" \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"comment\": \"Checkout funnel\", \"applicationId\": $APP_ID, \"tagIds\": []}")
echo "$TUNNEL" | json
TUNNEL_ID=$(echo "$TUNNEL" | json_field tunnelId)

echo ""
echo "=== 21. CREATE tag scoped to own application ==="
TAG=$(curl -s -X POST "$API/tags" \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"comment\": \"Add to cart\", \"applicationId\": $APP_ID, \"tunnelId\": \"$TUNNEL_ID\"}")
echo "$TAG" | json
TAG_ID=$(echo "$TAG" | json_field id)

echo ""
echo "=== 22. CREATE tag on another user's application (expect 500) ==="
expect_status 500 "$API/tags" \
  -X POST \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"comment\": \"Forbidden tag\", \"applicationId\": $BOB_APP_ID, \"tunnelId\": \"$TUNNEL_ID\"}"

echo ""
echo "=== 23. LIST tags filtered by applicationId ==="
ALICE_TAGS=$(curl -s "$API/tags?applicationId=$APP_ID" \
  -H "Authorization: Bearer $WM_TOKEN")
echo "$ALICE_TAGS" | json
echo "$ALICE_TAGS" | APP_ID="$APP_ID" node -e "
  const items = JSON.parse(require('fs').readFileSync(0,'utf8'));
  if (!items.length || String(items[0].applicationId) !== String(process.env.APP_ID)) {
    console.error('FAIL: tag list not scoped to applicationId');
    process.exit(1);
  }
  console.log('tags filtered by applicationId (ok)');
"

echo ""
echo "=== 24. Webmaster cannot GET tag from another user's application ==="
BOB_TUNNEL=$(curl -s -X POST "$API/tunnels" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"comment\": \"Bob funnel\", \"applicationId\": $BOB_APP_ID, \"tagIds\": []}")
BOB_TUNNEL_ID=$(echo "$BOB_TUNNEL" | json_field tunnelId)
BOB_TAG=$(curl -s -X POST "$API/tags" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"comment\": \"Bob tag\", \"applicationId\": $BOB_APP_ID, \"tunnelId\": \"$BOB_TUNNEL_ID\"}")
BOB_TAG_ID=$(echo "$BOB_TAG" | json_field id)
expect_status 404 "$API/tags/$BOB_TAG_ID" \
  -H "Authorization: Bearer $WM_TOKEN"

echo ""
echo "=== 25. PATCH tag (applicationId not patchable) ==="
TAG_PATCHED=$(curl -s -X PATCH "$API/tags/$TAG_ID" \
  -H "Authorization: Bearer $WM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Add to cart (updated)", "applicationId": '"$BOB_APP_ID"'}')
echo "$TAG_PATCHED" | json
echo "$TAG_PATCHED" | APP_ID="$APP_ID" node -e "
  const o = JSON.parse(require('fs').readFileSync(0,'utf8'));
  if (o.comment !== 'Add to cart (updated)') { console.error('FAIL: comment not updated'); process.exit(1); }
  if (String(o.applicationId) !== String(process.env.APP_ID)) {
    console.error('FAIL: applicationId should remain ' + process.env.APP_ID + ', got ' + o.applicationId);
    process.exit(1);
  }
  console.log('applicationId unchanged after patch (ok)');
"

echo ""
echo "=== Done ==="
