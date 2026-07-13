#!/bin/sh
set -e

cd /app

node scripts/ensure-deps.js

npm run d:s:u

exec npm run dev:node
