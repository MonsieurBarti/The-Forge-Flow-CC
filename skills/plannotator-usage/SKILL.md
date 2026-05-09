---
name: plannotator-usage
description: "Use when invoking plannotator for approval review of generated .tff-cc milestone artifacts (plan, verification, spec)."
---

# Plannotator Usage

## When to Use

∀ workflows that generate a load-bearing `.md` artifact under `.tff-cc/milestones/` or `.tff-cc/{quick,debug}/`.

## Integration Points

| Artifact | Workflow | Command | Notes |
|---|---|---|---|
| SPEC.md | /tff:discuss | invoke Skill `plannotator-annotate` with artifact path | Required |
| PLAN.md | /tff:plan, /tff:quick, /tff:debug | invoke Skill `plannotator-annotate` with artifact path | Required |
| VERIFICATION.md | /tff:verify | invoke Skill `plannotator-annotate` with artifact path | Required |

**Excluded:**
- STATE.md — sync artifact, not a human-reviewed document.
- RESEARCH.md (/tff:research) — intermediate notes, ¬ a terminal artifact; downstream review happens on PLAN.md.

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
