---
name: skill-authoring
description: "Use when creating, refining, or composing skills. Evidence-driven pattern analysis."
---

# Skill Authoring

## When to Use

∀ skill creation ∧ refinement tasks.

## HARD-GATE

∀ draft: evidence table required. ¬speculate — ¬ evidence -> ¬ skill.

## Skill File Format

```yaml
---
name: <kebab-case>
description: "Use when <trigger>"
---
```

## Description Contract

Description = the only field the loader sees when picking skills. Treat as API.

- ≤ 1024 chars
- Third person, ¬ first
- Sentence 1: capability (what it does)
- Sentence 2: `Use when <triggers>` — concrete keywords ∨ contexts ∨ file types
- ¬ symbolic notation, ¬ compression — loader matches literal substrings

Good: `Extract text and tables from PDFs, fill forms, merge documents. Use when working with PDF files or user mentions PDFs, forms, extraction.`
Bad: `Helps with documents.`

## Progressive Disclosure

```
skill-name/
├── SKILL.md           # ≤100 lines, required
├── REFERENCE.md       # detailed docs, optional
├── EXAMPLES.md        # worked examples, optional
└── scripts/           # deterministic helpers, optional
```

Split when:
- SKILL.md > 100 lines
- ∃ distinct domains in body (split per domain)
- ∃ rarely-used advanced features (move out of SKILL.md)

Linking: SKILL.md -> REFERENCE.md only (one level deep). ¬ chains.

## Scripts

Add scripts when:
- Operation deterministic (validation, formatting, parsing)
- Same code would be regenerated turn after turn
- Errors need explicit handling, ¬ best-effort

Scripts > generated code: fewer tokens, fewer regressions.

## Required Sections

1. **When to Use**: Trigger condition (∀ X workflow: load this skill)
2. **HARD-GATE** (if applicable): Mandatory constraint that blocks progress
3. **Checklist / Process**: Numbered steps, each a discrete action
4. **Output Format**: What the skill produces (table, file, verdict)
5. **Anti-Patterns**: Common mistakes (>=3)
6. **Rules**: Concise constraints using ∀/∃/¬ notation

## Compression Contract

Skill body uses formal notation: ∀ (all), ∃ (exists), ∈ (member), ∧ (and), ∨ (or), ¬ (not), -> (then). Target ~62% token reduction vs prose.

Default level: `ultra` for body. `off` for frontmatter ∧ description (loader parses literal).

### Π — protected zones (¬ compress, ∀ level)

frontmatter · description field · fenced code · inline code · URLs · file paths · CLI commands · headings (count + order) · tool names · numeric versions · quoted error strings · table structure · bullet nesting depth.

### Ω — Auto-Clarity fallback (drop notation -> prose)

section ∈ { security warning, destructive op, irreversible action, ordered multi-step where fragment order risks misread } -> prose, resume notation next section.

### Level dial

Skill MAY declare body compression level via frontmatter `compression: <off|lite|standard|ultra|symbolic>`. Default `ultra`. `symbolic` reserved for skills the model alone reads (¬ user-facing checklists).

## Evidence Requirements

- Pattern must appear ∈ >=3 sessions before becoming a skill
- Frequency + breadth + recency + consistency scoring
- Max 20% drift per refinement, 60% cumulative
- 7-day cooldown between refinements

## Skill Types

- **Rigid** (follow exactly): TDD, commit conventions, verification gates
- **Flexible** (adapt to context): brainstorming, documentation, debugging

## Skill Composition (LOAD Pattern)

Skills can load other skills for layered behavior:

```
LOAD @skills/<name>/SKILL.md
```

**Use Cases:**
- Layering methodology: base skill + domain-specific skill
- Review injection: brainstorming loads code-review-protocol for spec review
- Composition: executing-plans loads TDD + commit-conventions as baseline

**Example:** Brainstorming skill loads code-review-protocol for spec document reviewer:
```
# In brainstorming/SKILL.md review section:
LOAD @skills/code-review-protocol/SKILL.md
# Apply fresh-reviewer rule to spec review
```

## Modes

### Draft New Skill
1. Read `skills/` for format reference
2. Analyze pattern -> identify workflow
3. Write skill file: frontmatter + all required sections
4. Save -> `drafts directory (e.g., drafts/<name>.md)`

### Refine Existing
1. Read original skill + divergence evidence
2. Propose bounded diff — max_drift <= 20% of original content
3. Save -> `drafts directory`

### Compose Bundle
1. Read each skill ∈ cluster
2. co_activation >= 70% -> bundle (meta-skill with @skills/ refs)
3. Save -> `drafts directory`

## Anti-Patterns

- Writing skills from single observation (need >=3)
- Skills that describe rather than prescribe (skills are workflows, ¬documentation)
- Over-broad trigger conditions ("use always" = never triggered correctly)
- Skills without anti-patterns section (that's where the real value is)
- Compressing the description field (loader reads literal — symbolic notation breaks matching)
- Single-file skills > 100 lines (split into REFERENCE.md / EXAMPLES.md)
- Generating deterministic logic inline turn-after-turn instead of shipping a script

## Validation

Run skill validation before deployment.

## Pre-Promotion Checklist

∀ draft -> verify before promoting from drafts/:

- [ ] Description ≤ 1024 chars, 3rd person, includes `Use when <trigger>`, ¬ compressed
- [ ] SKILL.md ≤ 100 lines (∨ split into REFERENCE.md / EXAMPLES.md)
- [ ] Frontmatter ∧ description ∧ code blocks ∈ Π (uncompressed)
- [ ] Anti-Patterns section: ≥ 3 entries
- [ ] Evidence table: ≥ 3 sessions
- [ ] ¬ time-sensitive content (dates, "recent", "currently")
- [ ] Concrete examples, ¬ abstract description only
- [ ] References one level deep (SKILL.md -> REFERENCE.md, ¬ chains)
- [ ] Name ∈ `[a-z0-9-]{1,64}`, ¬ leading/trailing/consecutive hyphens
- [ ] ¬ dangerous_cmds (rm -rf, sudo, curl|bash)

## Rules

- ∀ draft: evidence_table required
- max_drift <= 20% for refinements
- Name: 1-64 chars, `[a-z0-9-]`, ¬ leading/trailing/consecutive hyphens
- Description: starts with "Use when"
- ¬dangerous_cmds (rm -rf, sudo, curl|bash)
- Drafts saved to drafts directory — user reviews before promotion
