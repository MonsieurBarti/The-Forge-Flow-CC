---
name: settings-template
description: Canonical commented YAML template for .tff-cc/settings.yaml — single source of truth for defaults
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

# ── Routing ───────────────────────────────────────────────────
# Per-workflow agent selection and model-tier policy.
# Disabled by default; opt in by setting `enabled: true`.
routing:
  # Master switch. When false, /tff:ship and friends use static
  # frontmatter pools without routing logs or tier decisions.
  enabled: false

  # Minimum signal confidence required to act on a routing decision.
  # Below this threshold the orchestrator falls back to the pool default.
  confidence_threshold: 0.5

  # Risk-level → model-tier mapping used by the layered router.
  # Tiers: haiku (fastest), sonnet (balanced), opus (most capable).
  tier_policy:
    low: haiku
    medium: sonnet
    high: opus

  # JSONL log of every routing decision. Path is resolved relative to
  # the project root and must remain inside it.
  logging:
    path: .tff-cc/logs/routing.jsonl

  # Calibration: aggregates routing outcomes per signal cell to flag
  # systematically over/under-tiered decisions.
  calibration:
    # Minimum samples per cell before calibration emits a suggestion.
    n_min: 5
    # Include join-debug fields in calibration output.
    debug_join:
      enabled: true
    # Optional per-source weight overrides for outcome aggregation.
    # source_weights:
    #   product-lead: 1.0
    #   code-reviewer: 1.0
    #   model-judge: 0.5

    # Model-judge: grades closed-slice routing decisions via a sub-agent.
    # Enabled by default; set `enabled: false` to disable `/tff:judge`.
    model_judge:
      enabled: true
      model: claude-haiku-4-5-20251001
      temperature: 0
      max_patch_bytes: 32768
      max_spec_bytes: 16384
      timeout_ms: 30000

  # Optional per-workflow pool override. When omitted, the pool is
  # read from the workflow command's frontmatter.
  # pools:
  #   tff:ship:
  #     - tff-code-reviewer
  #     - tff-security-auditor
```
