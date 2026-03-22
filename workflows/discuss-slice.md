# Discuss Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

**Autonomy**: check `.tff/settings.yaml` → `autonomy.mode` before pausing.

## Prerequisites
status = discussing

## Steps

### 1. Load Context
CHECK: read slice bead + notes

### 2. Interactive Design
LOAD @skills/interactive-design.md

**Phase 1 — Scope** (2-4 questions via AskUserQuestion)
- What problem does this solve? Who benefits?
- What constraints? (time, tech, dependencies)
- What does success look like?
- What are the known unknowns?

**Phase 2 — Approach** (1 message)
- Propose 2-3 approaches w/ trade-offs
- Recommend one, explain why
- User picks via AskUserQuestion

**Phase 3 — Design** (section by section)
- Present each section per tier template from @skills/interactive-design.md
- ∀ section: ask "does this look right?" via AskUserQuestion
- Revise until approved, then next section

### 3. Write Spec
WRITE `.tff/milestones/<milestone>/slices/<id>/SPEC.md` w/ validated design
UPDATE bead design field: `beadStore.updateDesign(id, spec_content)`

### 4. Challenge Spec (F-full only — determined in step 8)
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
AskUserQuestion: "Spec at `.tff/milestones/<milestone>/slices/<id>/SPEC.md`. Approve?"

### 8. Classify Complexity
Based on what was learned during discuss, build `ComplexitySignals`:
- `estimatedFilesAffected`, `newFilesCreated`, `modulesAffected`
- `requiresInvestigation`, `architectureImpact`, `hasExternalIntegrations`
- `taskCount`, `unknownsSurfaced`

RUN: `tff-tools slice:classify '<signals-json>'`

PRESENT result to user via AskUserQuestion:
- "Based on scope: **<tier>** (S / F-lite / F-full). Confirm or override?"
- Options: S (single-file fix), F-lite (standard), F-full (complex)

User confirms → record tier on bead.
If F-full confirmed → run step 4 (Challenge Spec) now if not already done.

### 9. Transition
tier = S → `tff-tools slice:transition <id> planning` (skip research)
tier = F-lite ∨ F-full → `tff-tools slice:transition <id> researching`
CHECK: `ok` = true → continue | `ok` = false → warn user, offer retry or abort

## Auto-Transition
After completing all steps above:
1. READ `.tff/settings.yaml` → check `autonomy.mode`
2. IF `plan-to-pr`:
   - Non-gate steps: IMMEDIATELY invoke the next workflow — do NOT ask the user
   - Human gates (plan approval, spec approval, completion): pause and ask
3. IF `guided`: suggest next step with `/tff:<command>`, wait for user
4. Log: `[tff] <slice-id>: discussing → researching|planning`
