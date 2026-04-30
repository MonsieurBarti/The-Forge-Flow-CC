#!/bin/bash
# tff phase boundary guard hook — warns on SPEC.md edits outside /tff:discuss workflow
# Exit 0 always. Never block. Never fail visibly.

# Read hook context from stdin (PreToolUse event with tool name and args)
INPUT=$(cat)

# Extract tool name from JSON input
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // empty')

# Only trigger on Edit or Write tools (ignore Bash, Read, Glob, Grep, etc.)
case "$TOOL_NAME" in
  "Edit"|"Write")
    # Continue with guard check
    ;;
  *)
    # Ignore other tools
    echo '{"suppressOutput":true}'
    exit 0
    ;;
esac

# Extract file path from tool_input.file_path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# If no file path provided, suppress output
if [ -z "$FILE_PATH" ]; then
  echo '{"suppressOutput":true}'
  exit 0
fi

# Call CLI to check for spec edit with the file path
CLI_OUTPUT=$(node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" spec-edit:guard "$FILE_PATH" 2>/dev/null)
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
