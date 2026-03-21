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
  # Used by: brainstormer, architect, code-reviewer, security-auditor
  quality:
    model: opus
  # Used by: product-lead, tester
  balanced:
    model: sonnet
  # Used by: frontend-dev, backend-dev, devops, fixer, doc-writer
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

# ── Auto-Learn ────────────────────────────────────────────────
# Skill detection and refinement from observed execution patterns.
# Note: these fields are forward-looking. Modifying them currently
# has no runtime effect — the runtime uses hardcoded defaults until
# the auto-learn consumer is implemented.
auto-learn:
  # Weights for pattern ranking (should sum to ~1.0)
  weights:
    frequency: 0.25    # how often the pattern appears
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
    min-sessions: 3     # min sessions to establish a pattern
    min-patterns: 2     # min similar patterns to form a cluster

# ── Dolt Remote (optional) ────────────────────────────────────
# Sync beads state to a remote Dolt database for team collaboration.
# Uncomment and configure after running: dolt remote add origin <url>
# dolt:
#   remote: origin
#   auto-sync: true
```
