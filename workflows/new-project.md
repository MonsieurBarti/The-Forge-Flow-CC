# New Project

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
∄ `.tff/PROJECT.md` — if exists → "Use `/tff:new-milestone`" ∧ stop

## Steps
0. CHECK beads: `bd --version`
   - fail → warn user:
     ```
     ⚠️  Beads (bd) is not installed. tff will run in degraded markdown-only mode.

     Beads is the coordination backbone of tff — it provides:
     • Atomic task claiming (prevents two agents grabbing the same work)
     • Dependency graphs for wave-based parallel execution
     • Real-time team state via Dolt remotes
     • bd ready — "what should I work on next?" for agents

     Strongly recommended:
       npm install -g @beads/bd
       brew install dolt

     Continue without beads? (y/N)
     ```
   - If user declines → stop, let them install
   - If user continues → proceed in markdown-only mode
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

## Git Merge Driver
Configure snapshot merge driver:
```bash
git config merge.tff-snapshot.driver "node ./tools/dist/tff-tools.cjs snapshot:merge %O %A %B"
```

6. NEXT: @references/next-steps.md
