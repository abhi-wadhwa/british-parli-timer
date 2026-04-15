#!/usr/bin/env bash
# Build assets/icon.icns from the PNG set produced by makeAppIcon.js.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ICONSET="$HERE/icon.iconset"
OUT="$HERE/icon.icns"

if [ ! -d "$ICONSET" ]; then
  echo "Generating iconset..."
  node "$HERE/makeAppIcon.js"
fi

iconutil -c icns "$ICONSET" -o "$OUT"
echo "Wrote $OUT"
