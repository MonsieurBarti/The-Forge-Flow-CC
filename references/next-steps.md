# Next Step Suggestions

Every tff command MUST end with next-step suggestion based on current state.

## State → Suggestion Map

| Current State | Suggested Command | Message |
|---|---|---|
| Project just created | `/tff:new-milestone` | "Project initialized. Create first milestone with `/tff:new-milestone`." |
| Milestone created, ¬ slices | `/tff:discuss` | "Milestone ready. Start scoping first slice with `/tff:discuss`." |
| Slice ∈ `discussing` | `/tff:discuss` | "Continue discussing, ∨ if scope locked, auto-advances to research." |
| Slice ∈ `researching` | `/tff:research` | "Research phase. Run `/tff:research` to investigate technical approach." |
| Slice ∈ `planning` | `/tff:plan` | "Ready to plan. Run `/tff:plan` to create tasks ∧ review via plannotator." |
| Slice ∈ `executing` | `/tff:execute` | "Execution phase. Run `/tff:execute` to start wave-based task execution." |
| Slice ∈ `verifying` | `/tff:verify` | "Verification phase. Run `/tff:verify` to check AC." |
| Slice ∈ `reviewing` | `/tff:ship` | "Ready for review. Run `/tff:ship` to create slice PR ∧ run reviews." |
| Slice ∈ `completing` | (auto) | "Slice being finalized. Closes automatically after merge." |
| Slice `closed`, more slices open | `/tff:discuss` ∨ `/tff:progress` | "Slice shipped! Run `/tff:progress` for status, ∨ `/tff:discuss` for next slice." |
| All slices `closed` | `/tff:audit-milestone` | "All slices complete. Run `/tff:audit-milestone` to verify milestone readiness." |
| Milestone audited | `/tff:complete-milestone` | "Audit passed. Run `/tff:complete-milestone` to create milestone PR." |
| Milestone `closed` | `/tff:new-milestone` | "Milestone shipped! Start next with `/tff:new-milestone`." |

## Usage

At end of every workflow, add:

```
### Next Step
Read current state and suggest appropriate next command from @references/next-steps.md.
```

## Paused/Resumed States

| State | Suggested Command |
|---|---|
| Checkpoint ∃ | `/tff:resume` | "Found saved checkpoint. Run `/tff:resume` to continue from where left off." |
| Verification failed | `/tff:execute` | "Verification found issues. Run `/tff:execute` to fix ∧ re-run failed tasks." |
| PR changes requested | `/tff:ship` | "Review requested changes. Run `/tff:ship` to apply fixes ∧ re-review." |
