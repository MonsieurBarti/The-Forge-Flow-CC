---
name: plannotator-usage
description: "Use when invoking plannotator for plan approval and verification review."
---

# Plannotator Usage

## When to Use

∀ workflows needing plannotator (plan approval, verification review).

## Integration Points

| Point | Workflow | Command | Input |
|---|---|---|---|
| Plan review | /tff:plan, /tff:quick, /tff:debug | invoke Skill `plannotator-annotate` with arg `.tff/milestones/<milestone>/slices/<id>/PLAN.md` | PLAN.md |
| Verification | /tff:verify | invoke Skill `plannotator-annotate` with arg `.tff/milestones/<milestone>/slices/<id>/VERIFICATION.md` | VERIFICATION.md |

∀ points: opens interactive UI → user annotates → feedback returns to stdout → agent processes

## Command Frontmatter

```yaml
allowed-tools: Skill(plannotator-annotate)
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
