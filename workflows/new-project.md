# New Project

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
∄ `.tff/PROJECT.md` — if exists → "Use `/tff:new-milestone`" ∧ stop

## Steps
1. ASK user: project name (required), vision statement
2. INIT: `tff-tools project:init "<name>" "<vision>"`
3. CREATE `.tff/REQUIREMENTS.md`: ask user for requirements → structured doc
4. FIRST MILESTONE: ask goal → execute new-milestone workflow
5. SUMMARY: show created files (PROJECT.md, REQUIREMENTS.md, milestone + branch)
   - suggest `/tff:discuss`
6. NEXT: @references/next-steps.md
