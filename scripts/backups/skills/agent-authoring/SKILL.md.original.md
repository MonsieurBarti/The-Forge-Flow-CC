---
name: agent-authoring
description: "Use when creating or modifying agents. Standardized template, identity-only, skills-loaded."
---

# Agent Authoring

## When to Use

∀ new agent creation, ∀ agent modification.

## HARD-GATE

Agent file must follow standardized template. ¬methodology ∈ agent files. Methodology belongs ∈ skills.

## When to Create an Agent

Only create agents when fresh-reviewer enforcement requires persistent identity. ∀ other cases -> skill + fresh subagent.

Identity tracking is needed when:
- The agent must be identifiable for "never reviews own code" enforcement
- Audit trail requires consistent identity across sessions

## Standardized Template

```markdown
---
name: <project>-<role>
model: <opus|sonnet>
identity: <role> — tracked for fresh-reviewer enforcement
---

# <project>-<role>

## Purpose
<one-line purpose>

## Skills Loaded
- @skills/<skill-1>/SKILL.md
- @skills/<skill-2>/SKILL.md

## Fresh-Reviewer Rule
¬review code written by this agent. Identity tracked via `verify reviewer identity`.

## Scope
<what this agent does and does NOT do>
```

## Checklist

1. Define identity -> why does this need persistent identity?
2. Assign model -> opus (quality) ∨ sonnet (balanced/budget)
3. List skills -> which skills does this agent load?
4. Define fresh-reviewer scope -> what can/cannot this agent review?
5. Validate -> ¬ methodology content ∈ agent file

## Anti-Patterns

- Baking methodology into agent (methodology belongs ∈ skills)
- Creating agents without identity-tracking need (use skill + fresh subagent instead)
- Personality-driven agents ("devil's advocate", "pragmatic modeler" — irrelevant to Claude)
- Agent files > 30 lines (if longer, methodology is leaking ∈)

## Rules

- ∀ agent: follows standardized template exactly
- ∀ agent: <= 30 lines (identity + skills refs only)
- ∀ methodology: extracted to skill file
- ∀ agent creation: justify why fresh subagent + skill won't suffice
