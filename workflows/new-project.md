# Workflow: New Project

## Prerequisites
- No existing tff project in this repo

## Steps

### 1. Check for existing project
Check if `.tff/PROJECT.md` already exists (read the file). If it does, tell the user: "This repo already has a tff project. Use `/tff:new-milestone` to start a new milestone." and stop.

### 2. Gather project information
Ask the user for:
- **Project name** (required)
- **Vision statement** — what is this project and why does it exist?

### 3. Initialize project
```bash
node <plugin-path>/tools/dist/tff-tools.cjs project:init "<name>" "<vision>"
```

### 4. Create REQUIREMENTS.md
Ask the user to describe their requirements. Create `.tff/REQUIREMENTS.md` with structured requirements.

### 5. Create first milestone
Ask: "What's the goal for your first milestone?"
Then execute the new-milestone workflow.

### 6. Summary
Show the user what was created:
- `.tff/PROJECT.md`
- `.tff/REQUIREMENTS.md`
- First milestone with its branch
- Suggest: "Use `/tff:discuss` to start discussing the first slice."
