#!/bin/bash
# tff observation hook — appends tool use to sessions.jsonl
# Exit 0 always. Never block. Never fail visibly.

# Check if observation is enabled (fast path: skip if no settings or disabled)
SETTINGS=".tff/settings.yaml"
if [ ! -f "$SETTINGS" ] || ! grep -q "enabled: true" "$SETTINGS" 2>/dev/null; then
  exit 0
fi

# Read hook event from stdin
INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

# Extract fields and append to JSONL
TOOL=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
ARGS=$(echo "$INPUT" | jq -r '.tool_input.command // .tool_input.file_path // empty')
SESSION=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p .tff/observations
echo "{\"ts\":\"$TS\",\"session\":\"$SESSION\",\"tool\":\"$TOOL\",\"args\":\"$ARGS\",\"project\":\"$(pwd)\"}" >> .tff/observations/sessions.jsonl

# Suppress output so it doesn't clutter the conversation
echo '{"suppressOutput":true}'
exit 0
