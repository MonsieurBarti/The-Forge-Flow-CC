---
name: settings-template
description: Canonical commented YAML template for .tff/settings.yaml — single source of truth for defaults
---

```yaml
# ═══════════════════════════════════════════════════════════════
# TFF Project Settings
# ═══════════════════════════════════════════════════════════════

# ── Model Profiles ────────────────────────────────────────────
# Assign AI models to agent roles by computational budget.
# Options: opus (most capable), sonnet (balanced), haiku (fastest)
model-profiles:
  # Used by: code-reviewer, spec-reviewer, security-auditor
  quality:
    model: opus
  # Used by: subagents with critical skills
  balanced:
    model: sonnet
  # Used by: fixer, subagents with workflow/background skills
  budget:
    model: sonnet

# ── Autonomy ──────────────────────────────────────────────────
# Controls how workflows transition between phases.
#
# "guided"     — pauses at every step for human approval
#                recommended for new projects and learning tff
# "plan-to-pr" — auto-transitions non-gate statuses, pauses only
#                at human gates (plan approval, completion approval)
#                recommended once comfortable with the workflow
autonomy:
  mode: guided
  max-retries: 2   # max review/verify retry cycles before escalation

# ── Auto-Learn ────────────────────────────────────────────────
# Skill detection and refinement from observed execution patterns.
# Note: these fields are forward-looking. Modifying them currently
# has no runtime effect — runtime uses hardcoded defaults until
# auto-learn consumer is implemented.
auto-learn:
  # Weights for pattern ranking (should sum to ~1.0)
  weights:
    frequency: 0.25    # how often pattern appears
    breadth: 0.30      # how many projects contain it
    recency: 0.25      # how recently observed (14-day half-life)
    consistency: 0.20   # fraction of sessions containing it
  # Safety constraints for skill evolution
  guardrails:
    min-corrections: 3  # min deviations before proposing refinement
    cooldown-days: 7    # days to wait between refinements
    max-drift-pct: 20   # max % change per refinement (60% cumulative)
  # Pattern clustering thresholds
  clustering:
    min-sessions: 3     # min sessions to establish pattern
    min-patterns: 2     # min similar patterns to form cluster
    jaccard-threshold: 0.3  # max Jaccard distance for cluster membership

# ── Workflow ──────────────────────────────────────────────────
# Session reminders and graduated enforcement for workflow adherence
#
# Soft enforcement philosophy (D001): Advisory warnings guide users toward
# tracked workflow commands without blocking legitimate direct edits.
# Balances guidance for newcomers with flexibility for experts.

# Show reminder on new Claude Code sessions with current
# milestone, slice, phase, and wave position
workflow:
  reminders: true
  # Enable guard hooks that detect workflow bypasses and inject advisory warnings.
  # When guards: true, both detection systems are active:
  #
  # 1. Direct-edit detection (S02): Catches code changes made without /tff commands
  #    - Triggers on Bash PreToolUse events (file writes, command execution)
  #    - Suggests using /tff:quick for tracked fixes instead of direct edits
  #
  # 2. Phase-boundary detection (S03): Catches SPEC.md modifications outside /tff:discuss
  #    - Triggers on Edit/Write PreToolUse events targeting SPEC.md files
  #    - Suggests using /tff:discuss for spec changes to ensure STATE.md sync
  #
  # Both guards follow D001 soft enforcement philosophy:
  # - Advisory only (never blocking) - users can proceed after seeing warning
  # - Respects guards: false to disable all detection
  # - Integrates with PreToolUse hooks for real-time interception
  #
  # Settings:
  # - true:  All guard hooks enabled (default, safe default per D002)
  # - false: All guard hooks disabled
  guards: true
```
