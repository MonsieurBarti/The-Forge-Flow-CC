#!/bin/bash
# compress-markdown.sh - Batch compress instruction markdown files using symbolic compression
#
# Compresses all instruction markdown files to symbolic level for token reduction.
# Creates .original.md backups for each compressed file.
#
# Usage: ./scripts/compress-markdown.sh [--dry-run]
#
# This script delegates to the Node.js implementation for actual compression.
# The Node.js script handles:
#   - Symbolic compression (lite → standard → ultra → symbolic)
#   - Protected zones (frontmatter, code blocks, URLs, etc.)
#   - Backup creation (.original.md sidecars)
#
# Target directories:
#   - commands/tff/*.md (30 files)
#   - workflows/*.md (23 files)
#   - skills/*/SKILL.md (18 files)
#   - references/*.md (10 files)
#   - agents/*.md (4 files)
#
# Total: 85 files

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Pass all arguments to the Node.js script
node "$SCRIPT_DIR/compress-symbolic.mjs" "$@"
