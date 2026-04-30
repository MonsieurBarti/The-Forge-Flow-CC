---
name: report-issue
description: "Use when the user wants to report a bug, file an issue, or send feedback about tff-cc. Triggers on phrases like 'report issue', 'file a bug', 'tff-cc broke', 'something is wrong with tff-cc', 'open an issue', '/report-issue'."
compression: ultra
---

# Report Issue

## When to Use

User reports tff-cc bug ∨ unexpected behavior ∨ wants to file an issue against the tff-cc repo. Repo target: `MonsieurBarti/The-Forge-Flow-CC`.

## HARD-GATE

¬ submit until user explicitly confirms issue body (filing publicly = irreversible). Show full draft -> ask `submit? [y/N]`. Default = ¬ submit.

## Checklist

1. **Detect command** — verify `gh` available: `gh --version`. ¬ available -> abort, instruct user `brew install gh && gh auth login`.
2. **Collect context** — gather in parallel:
   - tff-cc version: read `package.json`.version
   - node + OS: `node --version`, `uname -s -r`
   - Recent slice ∨ state: `.tff-cc/STATE.md` if exists (truncate ≤ 80 lines)
   - Recent commits: `git log --oneline -5`
   - User-supplied: error message, repro steps, expected vs actual
3. **Classify** — ask user one question: `kind ∈ { bug, feature-request, question, docs }`. Default `bug`.
4. **Draft** — render issue body per template below.
5. **Show draft** — present title + body to user verbatim.
6. **Confirm** — `submit? [y/N]`. ¬ y -> save draft to `/tmp/tff-cc-issue-<timestamp>.md` ∧ abort.
7. **Submit** — `gh issue create --repo MonsieurBarti/The-Forge-Flow-CC --title "<title>" --body-file <draft-path> --label <kind>`.
8. **Report** — print returned URL.

## Issue Template

```md
## Summary
<one-line>

## Environment
- tff-cc: <version>
- node: <version>
- OS: <uname>

## Repro
<steps>

## Expected
<what should happen>

## Actual
<what happened — include error verbatim ∈ ``` fence>

## Context
<recent slice / commits if relevant — collapse ∈ <details>>
```

## Output Format

- On success: `https://github.com/MonsieurBarti/The-Forge-Flow-CC/issues/<n>`
- On abort: path to saved draft `/tmp/tff-cc-issue-<ts>.md`
- On `gh` missing: install instructions, ¬ partial state

## Anti-Patterns

- Submitting without showing the user the rendered body first (irreversible publish)
- Pasting full STATE.md unredacted (may contain repo paths ∨ stale tokens — truncate ∧ scrub)
- Auto-classifying as `bug` when user said "feature" ∨ "question"
- Inventing repro steps the user didn't provide — ask, ¬ guess
- Filing against the wrong repo (always `MonsieurBarti/The-Forge-Flow-CC`, ¬ user's project repo)
- Re-submitting on retry without de-dup (offer search of existing issues first when title-similarity high)

## Rules

- Repo target hard-coded: `MonsieurBarti/The-Forge-Flow-CC`
- ∀ submission: user confirmation required
- ∀ context blob > 80 lines: truncate ∧ note `<truncated>`
- ¬ include secrets (env vars, tokens, absolute paths under `/Users/<name>` -> mask to `~`)
- ¬ submit if `gh auth status` fails — instruct `gh auth login` instead
