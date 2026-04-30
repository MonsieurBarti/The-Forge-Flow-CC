---
name: receiving-code-review
description: "Use when processing review feedback. Technical rigor, not performative agreement."
---

# Receiving Code Review

## When to Use

∀ review feedback from any reviewer.

## HARD-GATE

¬blindly implement review suggestions. Verify each suggestion is technically correct first.

## Process

∀ review finding:
1. UNDERSTAND: What exactly is the reviewer asking for?
2. VERIFY: Is the suggestion technically correct?
   - Read the code the reviewer references
   - Check if the reviewer's understanding matches reality
   - If unclear, ask for clarification (¬guess)
3. EVALUATE: Does implementing this improve the code?
   - Correct finding -> implement
   - Wrong finding -> push back with evidence
   - Style preference -> discuss, ¬auto-implement
4. IMPLEMENT: If accepted, make the change + verify it doesn't break anything

## Anti-Patterns

- Performative agreement ("great catch!" then implementing wrong suggestion)
- Implementing every suggestion without evaluation
- Defensive rejection of valid feedback
- Making changes without understanding why

## Rules

- ∀ accepted change: run tests after implementing
- ∀ rejected finding: explain with evidence (code reference, test output)
- Severity Critical/Important -> must address (implement ∨ push back with evidence)
- Severity Minor -> may defer with justification
