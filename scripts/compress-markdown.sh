#!/bin/bash
# compress-markdown.sh - Batch compress instruction markdown files using ultra-compress skill
#
# Compresses all instruction markdown files to symbolic level for token reduction.
# Creates .original.md backups for each compressed file.
#
# Usage: ./scripts/compress-markdown.sh [--dry-run]
#
# Target directories:
#   - commands/tff/*.md
#   - workflows/*.md
#   - skills/*/SKILL.md
#   - references/*.md
#   - agents/*.md

set -e

# Configuration
LOG_FILE="compression.log"
DRY_RUN="${1:-}"

# Clear log file at start
> "$LOG_FILE"

# Target directories
DIRS=(
  "commands/tff"
  "workflows"
  "skills"
  "references"
  "agents"
)

# Function to compress a single file
# Usage: compress_file <filepath>
compress_file() {
  local file="$1"
  
  # Check if file exists
  if [[ ! -f "$file" ]]; then
    echo "[ERROR] File not found: $file" | tee -a "$LOG_FILE"
    return 1
  fi
  
  # Log the compression
  echo "[compress] $file" | tee -a "$LOG_FILE"
  
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "[DRY-RUN] Would compress: $file" | tee -a "$LOG_FILE"
    return 0
  fi
  
  # Invoke ultra-compress via PI non-interactive mode
  # The skill will:
  # 1. Create .original.md backup
  # 2. Compress to symbolic level
  # 3. Validate protected zones
  # 4. Auto-repair on validation failure (≤2 attempts)
  if pi -p "/uc-file $file symbolic --yes" 2>&1 | tee -a "$LOG_FILE"; then
    echo "[OK] $file" | tee -a "$LOG_FILE"
  else
    echo "[FAILED] $file - compression or validation failed" | tee -a "$LOG_FILE"
    return 1
  fi
}

# Main execution
echo "=== Markdown Compression Script ===" | tee "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Track stats
TOTAL_FILES=0
SUCCESS_FILES=0
FAILED_FILES=0

# Process each directory
for dir in "${DIRS[@]}"; do
  if [[ ! -d "$dir" ]]; then
    echo "[WARN] Directory not found: $dir" | tee -a "$LOG_FILE"
    continue
  fi
  
  echo "" | tee -a "$LOG_FILE"
  echo "Processing: $dir" | tee -a "$LOG_FILE"
  echo "----------------------------------------" | tee -a "$LOG_FILE"
  
  # Special handling for skills directory (SKILL.md pattern)
  if [[ "$dir" == "skills" ]]; then
    while IFS= read -r -d '' file; do
      ((TOTAL_FILES++)) || true
      if compress_file "$file"; then
        ((SUCCESS_FILES++)) || true
      else
        ((FAILED_FILES++)) || true
      fi
    done < <(find "$dir" -name "SKILL.md" -type f -print0)
  else
    # Other directories: find all .md files at max depth 1
    while IFS= read -r -d '' file; do
      ((TOTAL_FILES++)) || true
      if compress_file "$file"; then
        ((SUCCESS_FILES++)) || true
      else
        ((FAILED_FILES++)) || true
      fi
    done < <(find "$dir" -maxdepth 1 -name "*.md" -type f -print0)
  fi
done

# Summary
echo "" | tee -a "$LOG_FILE"
echo "=== Summary ===" | tee -a "$LOG_FILE"
echo "Total files: $TOTAL_FILES" | tee -a "$LOG_FILE"
echo "Successful: $SUCCESS_FILES" | tee -a "$LOG_FILE"
echo "Failed: $FAILED_FILES" | tee -a "$LOG_FILE"
echo "Completed: $(date)" | tee -a "$LOG_FILE"

# Exit with error if any files failed
if [[ $FAILED_FILES -gt 0 ]]; then
  echo "" | tee -a "$LOG_FILE"
  echo "[ERROR] $FAILED_FILES file(s) failed compression. Check $LOG_FILE for details." | tee -a "$LOG_FILE"
  exit 1
fi

exit 0
