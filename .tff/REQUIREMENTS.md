# Requirements — M02: V0.5.3 Workflow Robustness

## R01 — Milestone Numbering Fix
`milestone:create` must derive milestone number from highest existing ID (max+1), not count of milestones. Same pattern as the S12 slice numbering fix.

## R02 — Bead Status Reconciliation
Bead statuses must stay in sync with actual state. On milestone completion, verify and reconcile all bead statuses against merged PRs before closing. Stale beads (open but shipped) must be detected and fixed.

## R03 — Workflow Error Handling
Workflows must check tff-tools command results for errors and surface failures explicitly. Silent continuation on failure is not acceptable. Failed commands → warn user → offer retry or abort.

## R04 — Security Hardening (MEDIUM findings)
Address M01 audit findings: path traversal guard in markdown-artifact adapter (reject `../` sequences), Dolt remote value validation (allowlist or flag-injection prevention).

## R05 — Milestone-Scoped Directory Structure
Restructure `.tff/` to scope artifacts per milestone: `.tff/milestones/M0X/REQUIREMENTS.md`, `.tff/milestones/M0X/slices/M0X-S0X/`. Each milestone has its own requirements and slice directories.

## R06 — Mandatory Plan Approval
Every task gets a plan — including S-tier/quick fixes. The plan can be lightweight (1-2 sentences) but must be presented to the user for approval before execution. No workflow skips the plan step.

## R07 — Research for Non-Trivial Tasks
Research phase remains active for F-lite and F-full tasks. S-tier tasks skip research. Quick workflow keeps research skip but adds mandatory plan approval.
