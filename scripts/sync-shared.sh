#!/usr/bin/env bash
# Mirror the canonical Zod contracts (server/src/vendor/shared) into the client copy.
#
#   ./scripts/sync-shared.sh          copy server → client (deletes client-only files)
#   ./scripts/sync-shared.sh --check  exit 1 if the copies differ (used by CI)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/server/src/vendor/shared"
DEST="$ROOT/client/src/vendor/shared"

case "${1:-}" in
  --check)
    if diff -ru "$DEST" "$SRC"; then
      echo "shared contracts in sync"
    else
      echo "client/src/vendor/shared drifted from server/src/vendor/shared — run ./scripts/sync-shared.sh" >&2
      exit 1
    fi
    ;;
  "")
    rm -rf "$DEST"
    mkdir -p "$DEST"
    cp -R "$SRC/." "$DEST/"
    echo "copied $SRC → $DEST"
    ;;
  -h|--help)
    sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'
    ;;
  *)
    echo "unknown flag: $1 (try --help)" >&2
    exit 2
    ;;
esac
