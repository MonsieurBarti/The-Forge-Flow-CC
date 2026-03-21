# Compose (Skill Clusters)

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Detect skill co-activation clusters → propose bundles or agents.

## Prerequisites
observation enabled ∧ multiple skills in `skills/`

## Steps
1. DETECT: `tff-tools compose:detect '<co-activations-json>' <total-sessions>`
2. DISPLAY clusters (≥70% co-activation):
   ```
   1. [85%] hexagonal-architecture + commit-conventions + tdd
      17/20 sessions — suggestion: backend-workflow bundle
   2. [90%] code-review-checklist + hexagonal-architecture
      18/20 sessions — suggestion: review-workflow bundle
   ```
3. SPAWN tff-skill-drafter ("Compose Bundle" mode) for selected cluster:
   - provide cluster skills + co-activation rate → decides bundle vs agent
   - draft → `.tff/drafts/<name>.md`
4. REVIEW: `plannotator annotate .tff/drafts/<name>.md`
5. HANDLE:
   - approved bundle → `skills/<name>.md`
   - approved agent → `agents/<name>.md`
   - rejected → record, suppress future suggestions
6. NEXT: @references/next-steps.md
