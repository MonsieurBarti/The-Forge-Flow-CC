#!/usr/bin/env bash
set -e

TMPDIR=$(mktemp -d)
ORIGINAL_DIR=$(pwd)
cd "$TMPDIR"

# Setup
mkdir -p .tff-cc/observations
echo '{"ts":"old","session":"s0","tool":"Read","args":null,"project":"test"}' > .tff-cc/observations/dead-letter.jsonl
touch .tff-cc/observations/.initialized

# The hook requires settings.yaml with enabled: true
mkdir -p .tff
echo "enabled: true" > .tff-cc/settings.yaml

SESSIONS_FILE=".tff-cc/observations/sessions.jsonl"

# Run hook with mock input
echo '{"tool_name":"Edit"}' | bash "$ORIGINAL_DIR/hooks/tff-observe.sh" 2>/dev/null || true

# Check that sessions file exists and has content
if [[ -f "$SESSIONS_FILE" ]]; then
  LINES=$(wc -l < "$SESSIONS_FILE")
  if [[ "$LINES" -ge 1 ]]; then
    echo "PASS: observations written ($LINES lines)"
  else
    echo "FAIL: no observations written"
    cd "$ORIGINAL_DIR"
    rm -rf "$TMPDIR"
    exit 1
  fi
else
  echo "FAIL: sessions.jsonl not created"
  cd "$ORIGINAL_DIR"
  rm -rf "$TMPDIR"
  exit 1
fi

# Check dead-letter was cleared
if [[ -s .tff-cc/observations/dead-letter.jsonl ]]; then
  echo "FAIL: dead-letter not cleared after replay"
  cd "$ORIGINAL_DIR"
  rm -rf "$TMPDIR"
  exit 1
else
  echo "PASS: dead-letter cleared"
fi

cd "$ORIGINAL_DIR"
rm -rf "$TMPDIR"
echo "ALL TESTS PASSED"
