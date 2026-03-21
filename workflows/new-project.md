# New Project

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
∄ `.tff/PROJECT.md` — if exists → "Use `/tff:new-milestone`" ∧ stop

## Steps
1. CHECK beads: `bd --version`
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

2. DETECT existing codebase: scan for files matching common source extensions
   (`.ts`, `.js`, `.py`, `.go`, `.rs`, `.java`, `.rb`, `.swift`, `.kt`, `.c`, `.cpp`, `.h`,
    `.cs`, `.php`, `.ex`, `.hs`, `.ml`, `.scala`, `.clj`, `.vue`, `.svelte`, `.tsx`, `.jsx`)
   - If no source files found → skip to step 4
   - If source files found → continue to step 3

3. ONBOARD existing codebase:
   a. ASK: "This repo has existing code. I'd like to analyze it first to understand your project. Proceed?"
      - If no → skip to step 4 (user provides everything manually)
   b. INIT minimal: `mkdir -p .tff/docs` (map-codebase needs the output dir, not a full project)
   c. RUN: execute map-codebase workflow (3 parallel doc-writer agents → .tff/docs/)
      - If map-codebase fails → warn user, fall back to step 4 (manual input)
   d. SYNTHESIZE: read STACK.md, ARCHITECTURE.md, CONCERNS.md, CONVENTIONS.md
      - Propose: project name, vision statement, initial requirements
   e. PRESENT: "Here's what I understood about your project:" + proposed values
   f. REFINE: user corrects/approves via AskUserQuestion
   g. Continue to step 4 with pre-filled values

4. ASK user: project name (required), vision statement
   - Pre-filled from step 3 if onboarding occurred
5. INIT: `tff-tools project:init "<name>" "<vision>"`
6. SETTINGS: generate `.tff/settings.yaml` from @references/settings-template.md
7. CREATE `.tff/REQUIREMENTS.md`: ask user for requirements → structured doc
   - Pre-filled from step 3 if onboarding occurred
8. FIRST MILESTONE: ask goal → execute new-milestone workflow
9. SUMMARY: show created files (PROJECT.md, settings.yaml, REQUIREMENTS.md, milestone + branch)
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
3. Update `.tff/settings.yaml`: uncomment dolt section, set remote + auto-sync

## Git Merge Driver
Configure snapshot merge driver:
```bash
git config merge.tff-snapshot.driver "node ./tools/dist/tff-tools.cjs snapshot:merge %O %A %B"
```

10. NEXT: @references/next-steps.md
