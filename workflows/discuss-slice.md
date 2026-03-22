# Discuss Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

**Autonomy**: check `.tff/settings.yaml` → `autonomy.mode` before pausing.

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
REVISE → critical issues → loop Phase 3 (max 2) ∨ escalate
APPROVE → note concerns in spec, proceed

### 5. Validate AC
SPAWN tff-product-lead: {spec_content, acceptance_criteria}
∀ criterion: testable ∧ binary — gaps → revise via AskUserQuestion

### 6. Spec Review
DISPATCH anonymous reviewer via Agent tool (prompt: @skills/interactive-design.md)
Issues → fix, re-dispatch (max 3)

### 7. User Gate
AskUserQuestion: "Spec at `.tff/slices/<id>/SPEC.md`. Approve?"

### 8. Transition
`tff-tools slice:transition <id> researching`

## Auto-Transition
After completing all steps above:
1. READ `.tff/settings.yaml` → check `autonomy.mode`
2. IF `plan-to-pr`:
   - Non-gate steps: IMMEDIATELY invoke the next workflow — do NOT ask the user
   - Human gates (plan approval, spec approval, completion): pause and ask
3. IF `guided`: suggest next step with `/tff:<command>`, wait for user
4. Log: `[tff] <slice-id>: discussing → researching`
