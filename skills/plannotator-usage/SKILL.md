---
name: plannotator-usage
description: "Use when invoking plannotator for approval review of generated .tff-cc milestone artifacts (plan, verification, requirements, spec)."
---

# Plannotator Usage

## When to Use

∀ workflows that generate a `.md` artifact under `.tff-cc/milestones/` (except STATE.md).

## Integration Points

| Artifact | Workflow | Command | Notes |
|---|---|---|---|
| PLAN.md | /tff:plan, /tff:quick, /tff:debug | invoke Skill `plannotator-annotate` with artifact path | Required |
| VERIFICATION.md | /tff:verify | invoke Skill `plannotator-annotate` with artifact path | Required |
| REQUIREMENTS.md | /tff:research, /tff:discuss | invoke Skill `plannotator-annotate` with artifact path | Required |
| SPEC.md / design docs | /tff:plan (when generated) | invoke Skill `plannotator-annotate` with artifact path | Required |

**Excluded:** STATE.md — sync artifact, not a human-reviewed document.

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
