---
name: stress-testing-specs
description: "Use when stress-testing design specs. Devil's advocate for assumptions, unknowns, scope."
---

# Stress-Testing Specs

## When to Use

∀ complex specs after initial draft. Optional for standard.

## HARD-GATE

¬approve spec until stress-tested. ∀ assumption: challenge explicitly.

## Methodology

1. PRE-MORTEM: "It's 6 months later ∧ this failed. Why?"
   - List 3-5 failure modes
   - ∀ mode: probability, impact, mitigation
2. ASSUMPTION HUNT: ∀ statement ∈ spec:
   - Verified ∨ assumed?
   - What if the opposite is true?
   - What dependency could break this?
3. SCOPE CREEP CHECK:
   - What's the smallest version that delivers value?
   - What could be deferred to next slice?
4. EDGE CASES:
   - ∅ state, concurrent access, failure recovery
   - What happens when [external dependency] is down?

## Output Format

```
## Spec Challenge — [Slice]
### Verdict: APPROVE | REVISE

### Critical Issues (blocks planning)
| # | Section | Issue | Risk |

### Concerns (note in spec, proceed)
| # | Section | Concern | Suggestion |

### Assumptions Verified
- [assumption] — [why holds]
```

## Anti-Patterns

- Rubber-stamping ("looks good" without reading spec)
- Challenging style instead of substance
- Blocking on low-severity issues
- ¬reading the actual spec before challenging

## Rules

- Max 2 iteration rounds (¬infinite loop)
- ∀ challenge: propose alternative, ¬just criticize
- Stop at spec-level, ¬descend into implementation details
- ∀ question: specific ∧ has WHY
