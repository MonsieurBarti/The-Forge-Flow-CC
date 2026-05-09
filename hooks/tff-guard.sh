#!/bin/bash
# tff direct-edit guard hook — warns on direct code edits without workflow commands
# Exit 0 always. Never block. Never fail visibly.

# Read hook context from stdin (PreToolUse event with tool name and args)
INPUT=$(cat)

# Extract tool name from JSON input
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // empty')

# Only trigger on Edit, Write, or Bash tools (ignore Read, Glob, Grep, etc.)
case "$TOOL_NAME" in
  "Edit"|"Write"|"Bash")
    # Continue with guard check
    ;;
  *)
    # Ignore other tools
    echo '{"suppressOutput":true}'
    exit 0
    ;;
esac

# Call CLI to check for direct edit
CLI_OUTPUT=$(node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" direct-edit:guard 2>/dev/null)
if [ -z "$CLI_OUTPUT" ]; then
  echo '{"suppressOutput":true}'
  exit 0
fi

# Parse JSON response
OK=$(echo "$CLI_OUTPUT" | jq -r '.ok // false')
WARNING=$(echo "$CLI_OUTPUT" | jq -r '.data.warning // empty')

# Output warning as injected block if present
if [ "$OK" = "true" ] && [ -n "$WARNING" ]; then
  # Escape the warning text for JSON embedding
  WARNING_ESCAPED=$(echo "$WARNING" | jq -Rs '.[:-1]')
  echo "{\"suppressOutput\":false,\"injected\":true,\"blocks\":[{\"type\":\"text\",\"text\":$WARNING_ESCAPED}]}"
else
  echo '{"suppressOutput":true}'
fi

exit 0
