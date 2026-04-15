---
name: brainstorming
description: "Use when starting design or discovery work. MUST use before any creative work."
---

# Brainstorming

## When to Use

∀ design ∧ discovery phases. Explores intent -> design -> approval.

## HARD-GATE

Do NOT invoke any implementation skill, write any code, ∨ take any implementation action until design presented ∧ approved. Applies to EVERY project regardless of perceived simplicity.

## Conversation Rules

1. One question per message
2. Multiple choice preferred (A/B/C/D) — open-ended when needed
3. Assess scope first: multi-subsystem -> decompose before detailing
4. ∀ assumption: surface explicitly, ¬proceed on implicit agreement
5. Propose 2-3 approaches w/ trade-offs before committing

## Flow

1. FRAME: Define problem, constraints, scope (2-4 questions)
2. APPROACH: Propose 2-3, recommend one, user picks
3. DESIGN: Section-by-section, user approves each inline
   - standard: problem, approach, acceptance criteria, non-goals (~1 page)
   - complex: + constraints, architecture, error handling, testing strategy (~3 pages)
4. WRITE: `project spec document (e.g., docs/specs/SPEC.md)`
5. REVIEW: Dispatch anonymous spec reviewer subagent (max 3 iterations)
6. USER GATE: Show spec, ask approval inline

## Spec Document Reviewer

Dispatch via Agent tool (subagent_type: general-purpose) with prompt from brainstorming review template. Max 3 iterations. Calibration: only flag issues that cause real problems during planning.

## Plan Document Reviewer

Dispatch via Agent tool (subagent_type: general-purpose). Checks: completeness, task decomposition, buildability, TDD, traceability, YAGNI, file structure. Max 3 iterations.

## Anti-Patterns

- "This is too simple to need a design" — WRONG. Simple projects are where unexamined assumptions cause the most wasted work.
- Implementing before design approved
- Skipping the FRAME phase (defining problem before solving)
- Rubber-stamping spec review iterations

## Rules

- ∀ section: user approves before next
- ∀ spec: reviewed by anonymous subagent
- ∀ approach: trade-offs documented
- ¬implement anything until design approved
