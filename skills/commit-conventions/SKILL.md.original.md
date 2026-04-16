---
name: commit-conventions
description: "Use when making git commits. Conventional commit format and rules."
---

# Commit Conventions

## When to Use

∀ git commits.

## Format: `<type>(<scope>): <summary>`

| Type | When |
|---|---|
| `feat` | New feature ∨ capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding ∨ updating tests |
| `docs` | Documentation changes |
| `chore` | Tooling, config, dependencies |

Scope: feature work → `auth/login` | module → `api/users` | general → omit scope

```
feat(auth/login): add user validation
fix(auth/login): handle null email in signup
test(auth/login): add failing spec for email validation
docs(api): update API documentation
revert(auth/login): undo broken migration
chore: update dependencies
```

## Rules

1. Atomic: 1 logical change/commit
2. Stage specific files (¬`git add .` ¬`git add -A`)
3. ¬commit generated files
4. ¬commit secrets (.env, credentials, API keys)
5. Imperative summary ("add" ¬"added"), <72 chars

## Enforcement

Enforced by lefthook `commit-msg` hook. ¬bypass with --¬-verify.
