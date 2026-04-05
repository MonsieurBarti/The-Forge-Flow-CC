# New Project

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
∄ `.tff/PROJECT.md` — if ∃ → "Use `/tff:new-milestone`" ∧ stop

## Steps
1. DETECT existing codebase: scan for files matching common source extensions
   (`.ts`, `.js`, `.py`, `.go`, `.rs`, `.java`, `.rb`, `.swift`, `.kt`, `.c`, `.cpp`, `.h`,
    `.cs`, `.php`, `.ex`, `.hs`, `.ml`, `.scala`, `.clj`, `.vue`, `.svelte`, `.tsx`, `.jsx`)
   - If ¬ source files found → skip to step 3
   - If source files found → continue to step 2

2. ONBOARD existing codebase:
   a. ASK: "This repo has existing code. I'd like to analyze it first to understand your project. Proceed?"
      - If ¬ → skip to step 3 (user provides everything manually)
   b. INIT minimal: `mkdir -p .tff/docs` (map-codebase needs the output dir, ¬ a full project)
   c. RUN: execute map-codebase workflow (3 parallel doc-writer agents → .tff/docs/)
      - If map-codebase fails → warn user, fall back to step 3 (manual input)
   d. SYNTHESIZE: read STACK.md, ARCHITECTURE.md, CONCERNS.md, CONVENTIONS.md
      - Propose: project name, vision statement, initial requirements
   e. PRESENT: "Here's what I understood about your project:" + proposed values
   f. REFINE: user corrects/approves via AskUserQuestion
   g. Continue to step 3 with pre-filled values

3. ASK user: project name (required), vision statement
   - Pre-filled from step 2 if onboarding occurred
4. INIT: `tff-tools project:init "<name>" "<vision>"`
5. SETTINGS: generate `.tff/settings.yaml` from @references/settings-template.md
6. SUMMARY: show created files (PROJECT.md, settings.yaml)
   - suggest `/tff:new-milestone` to create the first milestone

7. NEXT: @references/next-steps.md
