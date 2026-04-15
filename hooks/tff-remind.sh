#!/bin/bash
# tff session start reminder hook — injects context block on session start
# Exit 0 always. Never block. Never fail visibly.

# Check if reminders are enabled (fast path: skip if no settings or disabled)
SETTINGS=".tff/settings.yaml"
if [ ! -f "$SETTINGS" ] || ! grep -q "reminders: true" "$SETTINGS" 2>/dev/null; then
  exit 0
fi

# Read hook event from stdin (trigger only, content ignored)
INPUT=$(cat)

# Call CLI to get reminder
CLI_OUTPUT=$(node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" session:remind 2>/dev/null)
if [ -z "$CLI_OUTPUT" ]; then
  echo '{"suppressOutput":true}'
  exit 0
fi

# Parse JSON response
OK=$(echo "$CLI_OUTPUT" | jq -r '.ok // false')
REMINDER=$(echo "$CLI_OUTPUT" | jq -r '.data.reminder // empty')

# Output reminder as injected block if available
if [ "$OK" = "true" ] && [ -n "$REMINDER" ]; then
  # Escape the reminder text for JSON embedding
  REMINDER_ESCAPED=$(echo "$REMINDER" | jq -Rs '.[:-1]')
  echo "{\"suppressOutput\":false,\"injected\":true,\"blocks\":[{\"type\":\"text\",\"text\":$REMINDER_ESCAPED}]}"
else
  echo '{"suppressOutput":true}'
fi

exit 0
