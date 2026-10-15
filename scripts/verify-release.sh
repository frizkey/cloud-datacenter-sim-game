#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo " Cloud Datacenter Sim: Production Release Check "
echo "=========================================="

echo "[1/4] Running automated test suites..."
npm test

echo "[2/4] Building production Vite client bundle..."
npm run build

echo "[3/4] Syncing Capacitor mobile shell..."
npx cap sync android

echo "[4/4] Verifying production dist artifacts..."
if [ ! -f "dist/index.html" ] || [ ! -f "dist/sw.js" ] || [ ! -f "dist/manifest.json" ]; then
  echo "ERROR: Critical production bundle artifacts missing from dist/"
  exit 1
fi

echo "=========================================="
echo " ✅ ALL PRODUCTION PRE-FLIGHT CHECKS PASSED!"
echo "=========================================="
