# Suggest Skills

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Show ranked pattern candidates with human-readable summaries.

## Prerequisites
`/tff:detect-patterns` run (candidates.jsonl exists) — if ∄ → suggest detect first

## Steps
1. LOAD `.tff/observations/candidates.jsonl`
2. SUMMARIZE: for each candidate, spawn tff-skill-drafter (summarize mode) → one-line summary
3. DISPLAY numbered list:
   ```
   1. [0.78] Read -> Grep -> Edit -> Bash(npm test)
      12 occurrences, 8 sessions — TDD workflow
   2. [0.65] Bash(git add) -> Bash(git commit)
      25 occurrences, 15 sessions — atomic commit workflow
   Create a skill? (number/skip)
   ```
4. NEXT: user selects → suggest `/tff:create-skill <number>`
