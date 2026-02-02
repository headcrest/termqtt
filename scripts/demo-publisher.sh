#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec bun run "$ROOT_DIR/scripts/demo-publisher.ts" "$@"
