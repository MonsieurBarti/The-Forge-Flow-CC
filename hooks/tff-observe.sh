#!/bin/bash
# tff observation hook — appends tool use to sessions.jsonl
# Exit 0 always. Never block. Never fail visibly.

# Check if observation is enabled (fast path: skip if no settings or disabled)
SETTINGS=".tff-cc/settings.yaml"
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

OBS_DIR=".tff-cc/observations"
SESSIONS_FILE="$OBS_DIR/sessions.jsonl"
DEAD_LETTER="$OBS_DIR/dead-letter.jsonl"

# One-time directory init (skip mkdir on every invocation)
INIT_FLAG="$OBS_DIR/.initialized"
if [[ ! -f "$INIT_FLAG" ]]; then
  mkdir -p "$OBS_DIR" && touch "$INIT_FLAG"
fi

# Replay any dead-letter entries before appending
if [[ -f "$DEAD_LETTER" && -s "$DEAD_LETTER" ]]; then
  if cat "$DEAD_LETTER" >> "$SESSIONS_FILE" 2>/dev/null; then
    : > "$DEAD_LETTER"
  fi
fi

# Append current observation; fall back to dead-letter on failure.
# Build JSONL via jq to safely escape quotes, backslashes, newlines, etc.
# in $ARGS (arbitrary shell command / file path) and $(pwd).
LINE=$(jq -cn \
  --arg ts "$TS" \
  --arg session "$SESSION" \
  --arg tool "$TOOL" \
  --arg args "$ARGS" \
  --arg project "$(pwd)" \
  '{ts:$ts, session:$session, tool:$tool, args:$args, project:$project}')
if ! echo "$LINE" >> "$SESSIONS_FILE" 2>/dev/null; then
  echo "$LINE" >> "$DEAD_LETTER" 2>/dev/null
fi

# Suppress output so it doesn't clutter the conversation
echo '{"suppressOutput":true}'
exit 0
