#!/bin/sh
set -e

cd /app

if [ ! -d node_modules/express ]; then
  npm install
fi

npm run d:s:u

exec npm run dev:node
