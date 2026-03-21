# Discuss Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
status = discussing

## Steps

### 1. Load Context
CHECK: read slice bead + notes
CLASSIFY: `tff-tools slice:classify '<signals>'`
tier = S → auto-transition researching, skip discuss

### 2. Interactive Design (F-lite ∧ F-full)
LOAD @skills/interactive-design.md

**Phase 1 — Scope** (2-4 questions via AskUserQuestion)
- What problem does this solve? Who benefits?
- What constraints? (time, tech, dependencies)
- What does success look like?
- (F-full) What are the known unknowns?

**Phase 2 — Approach** (1 message)
- Propose 2-3 approaches w/ trade-offs
- Recommend one, explain why
- User picks via AskUserQuestion

**Phase 3 — Design** (section by section)
- Present each section per tier template from @skills/interactive-design.md
- ∀ section: ask "does this look right?" via AskUserQuestion
- Revise until approved, then next section

### 3. Write Spec
WRITE `.tff/slices/<id>/SPEC.md` w/ validated design
UPDATE bead design field: `beadStore.updateDesign(id, spec_content)`

### 4. Challenge Spec (F-full only)
SPAWN tff-brainstormer: {spec_content}
- Stress-tests assumptions, surfaces unknowns
- Critical issues → revise spec (loop to Phase 3, max 2 iterations then escalate)
- Minor concerns → note in spec, proceed

### 5. Validate Acceptance Criteria
SPAWN tff-product-lead: {spec_content, acceptance_criteria}
- ∀ criterion: testable ∧ binary
- Gaps → revise via AskUserQuestion

### 6. Spec Review
DISPATCH anonymous reviewer via Agent tool (prompt from @skills/interactive-design.md)
- Checks: completeness, consistency, clarity, scope, YAGNI
- Issues → fix, re-dispatch (max 3 iterations)

### 7. User Gate
AskUserQuestion: "Spec at `.tff/slices/<id>/SPEC.md`. Review and approve?"
Wait for approval

### 8. Transition
TRANSITION: `tff-tools slice:transition <id> researching`

## Auto-Transition
Read `.tff/settings.yaml` → `autonomy.mode`.
`plan-to-pr` ∧ ¬HUMAN_GATE → auto-invoke next workflow via `tff-tools workflow:next <status>`.
`guided` → suggest next step, wait for user.
Progress: `[tff] <slice-id>: discussing → researching`
