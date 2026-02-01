#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: install.sh <owner/repo> [version]"
  echo "Example: install.sh headcrest/termqtt"
  exit 1
fi

REPO="$1"
VERSION="${2:-latest}"
PREFIX="${TERMOTTQ_PREFIX:-$HOME/.local/bin}"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin) OS="macos" ;;
  Linux) OS="linux" ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

case "$ARCH" in
  x86_64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

ASSET="termqtt-${OS}-${ARCH}.zip"
if [[ "$VERSION" == "latest" ]]; then
  URL="https://github.com/${REPO}/releases/latest/download/${ASSET}"
else
  URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET}"
fi

TMPDIR="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

echo "Downloading ${URL}"
curl -fsSL "$URL" -o "$TMPDIR/$ASSET"

mkdir -p "$PREFIX"
unzip -oq "$TMPDIR/$ASSET" -d "$TMPDIR/unpacked"

cp "$TMPDIR/unpacked/termqtt" "$PREFIX/termqtt"
cp "$TMPDIR/unpacked/parser.worker.js" "$PREFIX/parser.worker.js"
chmod +x "$PREFIX/termqtt"

echo "Installed to $PREFIX"
echo "Make sure $PREFIX is in your PATH"
