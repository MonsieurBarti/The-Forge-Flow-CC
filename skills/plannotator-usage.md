---
name: Plannotator Usage
description: How to invoke plannotator for plan, verification, and code review
token-budget: background
---

# Plannotator Usage

## When to Use

∀ workflows needing plannotator (plan review, verification review, code review).

## Integration Points

| Point | Workflow | Command | Input |
|---|---|---|---|
| Plan review | /tff:plan | `plannotator annotate .tff/slices/M01-S01/PLAN.md` | PLAN.md |
| Verification | /tff:verify | `plannotator annotate .tff/slices/M01-S01/VERIFICATION.md` | VERIFICATION.md |
| Code review | /tff:ship | `plannotator review` | git diff |

∀ points: opens interactive UI → user annotates → feedback returns to stdout → agent processes

## Command Frontmatter

```yaml
allowed-tools: Bash(plannotator:*)
```

## Loop

```
generate artifact → plannotator → user annotates → read feedback →
  approved? → proceed
  feedback? → revise → loop
```

## Notes

- Hard dependency (¬terminal fallback)
- Install: `claude /plugin install plannotator@plannotator`
- SessionStart hook checks ∧ warns if missing
