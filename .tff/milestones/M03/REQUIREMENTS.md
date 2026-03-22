# Requirements — M03: V0.6.0 Classification Reform

## R01 — Classification Timing
Classification must happen at end of discuss phase (not beginning). The orchestrator proposes a tier based on actual scope discovered during discussion. User confirms or overrides via AskUserQuestion.

## R02 — S-Tier Criteria
S-tier is restricted to: single-file changes, no new files, no architecture impact, root cause already known. Anything requiring investigation, design decisions, or multi-file changes is F-lite minimum.

## R03 — User-Confirmed Classification
`slice:classify` output becomes a suggestion presented to the user, not an auto-routing decision. No workflow step is ever auto-skipped based on classification alone.

## R04 — Unified Pipeline
All tiers follow the same pipeline (discuss → research → plan → execute → verify → ship). Tiers control depth (lightweight vs full), not which steps are skipped. S-tier: lightweight discuss + skip research + lightweight plan. F-lite: full pipeline, optional research. F-full: full pipeline, required research + brainstormer.

## R05 — Quick/Debug Alignment
Quick and debug workflows feed into the standard pipeline instead of being parallel shortened flows. They become entry-point shortcuts (skip discuss for quick, skip discuss for debug phase 2) but converge on the same plan → execute → ship steps.

## R06 — Milestone Numbering Robustness
Fix milestone numbering to account for closed beads not being returned by `bd list`. Use snapshot or alternative source to determine true max milestone number.
