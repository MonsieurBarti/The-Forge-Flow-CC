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

## Dolt Remote (optional)
Prompt:
```
Sync beads to remote Dolt database for team collaboration?
a) DoltHub (hosted) — free public repos
b) Self-hosted Dolt remote
c) Skip (git snapshots only, configure later via /tff:settings)
```
If a) or b):
1. Guide: `dolt remote add origin <url>`
2. Guide: `dolt push --set-upstream origin main`
3. Write `.tff/settings.yaml`:
   ```yaml
   dolt:
     remote: origin
     auto-sync: true
   ```

6. NEXT: @references/next-steps.md
