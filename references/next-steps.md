# Next Step Suggestions

Every tff command MUST end with a next-step suggestion based on the current state.

## State → Suggestion Map

After each command completes, check the slice/milestone state and suggest:

| Current State | Suggested Command | Message |
|---|---|---|
| Project just created | `/tff:new-milestone` | "Project initialized. Create your first milestone with `/tff:new-milestone`." |
| Milestone created, no slices | `/tff:discuss` | "Milestone ready. Start scoping the first slice with `/tff:discuss`." |
| Slice in `discussing` | `/tff:discuss` | "Continue discussing, or if scope is locked, it will auto-advance to research." |
| Slice in `researching` | `/tff:research` | "Research phase. Run `/tff:research` to investigate the technical approach." |
| Slice in `planning` | `/tff:plan` | "Ready to plan. Run `/tff:plan` to create tasks and review via plannotator." |
| Slice in `executing` | `/tff:execute` | "Execution phase. Run `/tff:execute` to start wave-based task execution." |
| Slice in `verifying` | `/tff:verify` | "Verification phase. Run `/tff:verify` to check acceptance criteria." |
| Slice in `reviewing` | `/tff:ship` | "Ready for review. Run `/tff:ship` to create the slice PR and run reviews." |
| Slice in `completing` | (auto) | "Slice is being finalized. It will close automatically after merge." |
| Slice `closed`, more slices open | `/tff:discuss` or `/tff:progress` | "Slice shipped! Run `/tff:progress` to see overall status, or `/tff:discuss` for the next slice." |
| All slices `closed` | `/tff:audit-milestone` | "All slices complete. Run `/tff:audit-milestone` to verify milestone readiness." |
| Milestone audited | `/tff:complete-milestone` | "Audit passed. Run `/tff:complete-milestone` to create the milestone PR." |
| Milestone `closed` | `/tff:new-milestone` | "Milestone shipped! Start the next one with `/tff:new-milestone`." |

## How to Use

At the end of every workflow, add:

```
### Next Step
Read the current state and suggest the appropriate next command from @references/next-steps.md.
```

## Paused/Resumed States

| State | Suggested Command |
|---|---|
| Checkpoint exists | `/tff:resume` | "Found a saved checkpoint. Run `/tff:resume` to continue from where you left off." |
| Verification failed | `/tff:execute` | "Verification found issues. Run `/tff:execute` to fix and re-run failed tasks." |
| PR changes requested | `/tff:ship` | "Review requested changes. Run `/tff:ship` to apply fixes and re-review." |
