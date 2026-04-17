# Discuss Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

**Autonomy**: check `.tff-cc/settings.yaml` → `autonomy.mode` before pausing.

## Prerequisites
status = discussing

## Steps

### 1. Load Context
CHECK: read slice state + notes

### 2. Interactive Design
LOAD @skills/brainstorming/SKILL.md

**Phase 1 — Scope** (2-4 questions)
- What problem does this solve? Who benefits?
- What constraints? (time, tech, dependencies)
- What does success look like?
- What are the known unknowns?

**Phase 2 — Approach** (1 message)
- Propose 2-3 approaches w/ trade-offs
- Recommend one, explain why
- User picks inline

**Phase 3 — Design** (section by section)
- Present each section per tier template from @skills/brainstorming/SKILL.md
- ∀ section: ask "does this look right?" inline
- Revise until approved, then next section

### 3. Write Spec
WRITE `.tff-cc/milestones/<milestone>/slices/<id>/SPEC.md` w/ validated design

### 4. Challenge Spec (F-full only — determined ∈ step 8)
LOAD @skills/stress-testing-specs/SKILL.md → SPAWN subagent: {spec_content}
REVISE → critical issues → loop Phase 3 (max 2) ∨ escalate
APPROVE → note concerns ∈ spec, proceed

### 5. Validate AC
LOAD @skills/acceptance-criteria-validation/SKILL.md → SPAWN subagent: {spec_content, acceptance_criteria}
∀ criterion: testable ∧ binary — gaps → revise by asking user inline

### 6. Spec Review
DISPATCH anonymous reviewer via Agent tool (prompt: @skills/brainstorming/SKILL.md)
Issues → fix, re-dispatch (max 3)

### 7. User Gate
Ask user: "Spec at `.tff-cc/milestones/<milestone>/slices/<id>/SPEC.md`. Approve?"

### 8. Classify Complexity
Based on what was learned during discuss, build `ComplexitySignals`:
- `estimatedFilesAffected`, `newFilesCreated`, `modulesAffected`
- `requiresInvestigation`, `architectureImpact`, `hasExternalIntegrations`
- `taskCount`, `unknownsSurfaced`

RUN: `tff-tools slice:classify --signals '<signals-json>'`

PRESENT result to user, asking inline:
- "Based on scope: **<tier>** (S / F-lite / F-full). Confirm ∨ override?"
- Options: S (single-file fix), F-lite (standard), F-full (complex)

User confirms → `tff-tools slice:classify` records tier.
If F-full confirmed → run step 4 (Challenge Spec) now if ¬ already done.

### 9. Transition
tier = S → `tff-tools slice:transition --slice-id <id> --status planning` (skip research)
tier = F-lite ∨ F-full → `tff-tools slice:transition --slice-id <id> --status researching`
CHECK: `ok` = true → continue | `ok` = false → warn user, offer retry ∨ abort
  IF `ok` = true ∧ `warnings.length > 0`:
    ∀ warning ∈ warnings: display `⚠ <warning>` to user

## Auto-Transition
After completing all steps above:
1. READ `.tff-cc/settings.yaml` → check `autonomy.mode`
2. IF `plan-to-pr`:
   - Non-gate steps: IMMEDIATELY invoke the next workflow — do NOT ask user
   - Human gates (plan approval, spec approval, completion): pause ∧ ask
3. IF `guided`: suggest next step with `/tff:<command>`, wait for user
4. Log: `[tff] <slice-id>: discussing → researching|planning`
