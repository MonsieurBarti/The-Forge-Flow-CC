# New Project

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
∄ `.tff-cc/PROJECT.md` — if ∃ → "Use `/tff:new-milestone`" ∧ stop

## Steps
1. DETECT existing codebase: scan for files matching common source extensions
   (`.ts`, `.js`, `.py`, `.go`, `.rs`, `.java`, `.rb`, `.swift`, `.kt`, `.c`, `.cpp`, `.h`,
    `.cs`, `.php`, `.ex`, `.hs`, `.ml`, `.scala`, `.clj`, `.vue`, `.svelte`, `.tsx`, `.jsx`)
   - If ¬ source files found → skip to step 3
   - If source files found → continue to step 2

2. ONBOARD existing codebase:
   a. ASK: "This repo has existing code. I'd like to analyze it first to understand your project. Proceed?"
      - If ¬ → skip to step 3 (user provides everything manually)
   b. RUN: execute map-codebase workflow (3 parallel doc-writer agents → .tff-cc/docs/)
      - If map-codebase fails → warn user, fall back to step 3 (manual input)
   c. SYNTHESIZE: read STACK.md, ARCHITECTURE.md, CONCERNS.md, CONVENTIONS.md
      - Propose: project name, vision statement, initial requirements
   d. PRESENT: "Here's what I understood about your project:" + proposed values
   e. REFINE: user corrects/approves by asking inline
   f. Continue to step 3 with pre-filled values

3. ASK user: project name (required), vision statement
   - Pre-filled from step 2 if onboarding occurred
4. INIT: `tff-tools project:init --name "<name>" --vision "<vision>"`
5. SETTINGS: generate `.tff-cc/settings.yaml` from @references/settings-template.md
6. SUMMARY: show created files (PROJECT.md, settings.yaml)
   - suggest `/tff:new-milestone` to create first milestone

7. NEXT: @references/next-steps.md
