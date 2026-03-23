---
name: Commit Conventions
description: Git commit format and rules for tff projects
token-budget: workflow
---

# Commit Conventions

## When to Use

∀ git commits in tff projects.

## Format: `<type>(<scope>): <summary>`

| Type | When |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Tooling, config, dependencies |

Scope: slice work → `S01/T03` | artifacts → `S01` | rollbacks → `S01/T03`

```
feat(S01/T03): add user validation
fix(S01/T03): handle null email in signup
test(S01/T03): add failing spec for email validation
docs(S01): update PLAN.md with research
revert(S01/T03): undo broken migration
chore: update dependencies
```

## Rules

1. Atomic: 1 logical change/commit
2. Stage specific files (¬`git add .` ¬`git add -A`)
3. ¬commit generated files (except tff-tools.cjs)
4. ¬commit secrets (.env, credentials, API keys)
5. Imperative summary ("add" ¬"added"), <72 chars

## Enforcement

Enforced by lefthook `commit-msg` hook. ¬bypass with --no-verify.
