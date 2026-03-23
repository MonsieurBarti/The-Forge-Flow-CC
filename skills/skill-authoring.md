---
name: skill-authoring
description: "Use when creating, refining, or composing skills. Evidence-driven pattern analysis."
token-budget: workflow
---

# Skill Authoring

## When to Use

∀ create-skill, learn-skills, compose-skills, suggest-skills, detect-patterns workflows.

## HARD-GATE

∀ draft: evidence table required. ¬speculate — no evidence -> no skill.

## Skill File Format

```yaml
---
name: <kebab-case>
description: "Use when <trigger>"
token-budget: critical | workflow | background
---
```

## Required Sections

1. **When to Use**: Trigger condition (∀ X workflow: load this skill)
2. **HARD-GATE** (if applicable): Mandatory constraint that blocks progress
3. **Checklist / Process**: Numbered steps, each a discrete action
4. **Output Format**: What the skill produces (table, file, verdict)
5. **Anti-Patterns**: Common mistakes (>=3)
6. **Rules**: Concise constraints using ∀/∃/¬ notation

## Compression Rules (roxabi)

Use formal notation: ∀ (all), ∃ (exists), ∈ (member), ∧ (and), ∨ (or), ¬ (not), -> (then)
Target: ~62% token reduction vs prose

## Evidence Requirements

- Pattern must appear in >=3 sessions before becoming a skill
- Frequency + breadth + recency + consistency scoring
- Max 20% drift per refinement, 60% cumulative
- 7-day cooldown between refinements

## Skill Types

- **Rigid** (follow exactly): TDD, commit conventions, verification gates
- **Flexible** (adapt to context): brainstorming, documentation, debugging

## Token Budget Tiers

| Tier | When | Examples |
|---|---|---|
| critical | ∀ invocation, always loaded | TDD, debugging, code-review |
| workflow | Loaded when workflow triggers | skill-authoring, documentation |
| background | Loaded on demand | plannotator-usage |

## Modes

### Draft New Skill
1. Read `skills/` for format reference
2. Analyze pattern -> identify workflow
3. Write skill file: frontmatter + all required sections
4. Save -> `.tff/drafts/<name>.md`

### Refine Existing
1. Read original skill + divergence evidence
2. Propose bounded diff — max_drift <= 20% of original content
3. Save -> `.tff/drafts/<name>.md`

### Compose Bundle
1. Read each skill in cluster
2. co_activation >= 70% -> bundle (meta-skill with @skills/ refs)
3. Save -> `.tff/drafts/<name>.md`

## Anti-Patterns

- Writing skills from single observation (need >=3)
- Skills that describe rather than prescribe (skills are workflows, ¬documentation)
- Over-broad trigger conditions ("use always" = never triggered correctly)
- Skills without anti-patterns section (that's where the real value is)

## Validation

`tff-tools skills:validate '<json>'` must pass before deployment.

## Rules

- ∀ draft: evidence_table required
- max_drift <= 20% for refinements
- Name: 1-64 chars, `[a-z0-9-]`, no leading/trailing/consecutive hyphens
- Description: starts with "Use when"
- ¬dangerous_cmds (rm -rf, sudo, curl|bash)
- Drafts -> `.tff/drafts/` only — user reviews via plannotator before promotion
