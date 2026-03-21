# Skill: Plannotator Usage

## When to Use

Load this skill when a workflow needs to invoke plannotator for plan review, verification review, or code review.

## Three Integration Points

### 1. Plan Review (during /tff:plan)

After generating PLAN.md:

```bash
plannotator annotate .tff/slices/M01-S01/PLAN.md
```

- Opens interactive annotation UI in browser
- User can: add comments, mark deletions, suggest insertions
- Structured feedback returns to stdout
- Agent reads feedback, revises plan, re-submits until approved

### 2. Verification Review (during /tff:verify)

After product-lead generates VERIFICATION.md:

```bash
plannotator annotate .tff/slices/M01-S01/VERIFICATION.md
```

- User reviews findings, marks which to fix vs. accept
- Accepted findings → fixer agent spawned
- Dismissed findings → documented and closed

### 3. Code Review (during /tff:ship)

After review agents complete:

```bash
plannotator review
```

- Opens git diff in interactive review UI
- User annotates code changes
- Feedback returns → fixer agent applies changes

## Command Frontmatter

Commands that use plannotator must include in their frontmatter:

```yaml
allowed-tools: Bash(plannotator:*)
```

This grants permission to invoke the plannotator CLI.

## Loop Pattern

All plannotator interactions follow a loop:

```
1. Generate artifact (PLAN.md, VERIFICATION.md, or code diff)
2. Open plannotator
3. User annotates
4. Read feedback
5. If approved → proceed
6. If feedback → revise artifact → goto 2
```

## Notes

- Plannotator is a HARD dependency — no terminal fallback
- The plugin must be installed: `claude /plugin install plannotator@plannotator`
- The SessionStart hook checks for plannotator and warns if missing
