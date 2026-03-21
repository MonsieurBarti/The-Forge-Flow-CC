# Skill: Commit Conventions

## When to Use

Load this skill when making any git commit in a tff project.

## Format

```
<type>(<scope>): <summary>
```

### Type

| Type | When |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Tooling, config, dependencies |

### Scope

For slice work: `S01/T03` (slice ref / task ref)
For artifacts: `S01` (slice ref only)
For rollbacks: `S01/T03` (what's being reverted)

Examples:
```
feat(S01/T03): add user validation
fix(S01/T03): handle null email in signup
test(S01/T03): add failing spec for email validation
docs(S01): update PLAN.md with research
revert(S01/T03): undo broken migration
chore: update dependencies
```

## Rules

1. **Atomic commits** — one logical change per commit
2. **Stage specific files** — never `git add .` or `git add -A`
3. **Never commit generated files** — node_modules, dist (except tff-tools.cjs which is intentionally shipped)
4. **Never commit secrets** — .env, credentials, API keys
5. **Summary is imperative** — "add validation" not "added validation"
6. **Summary under 72 characters**
