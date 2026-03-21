#!/usr/bin/env node

// tools/src/cli/index.ts
var [command] = process.argv.slice(2);
if (!command || command === "--help" || command === "-h") {
  console.log(JSON.stringify({
    ok: true,
    data: {
      name: "tff-tools",
      version: "0.1.0",
      commands: [
        "project:init",
        "project:get",
        "milestone:create",
        "milestone:list",
        "slice:create",
        "slice:transition",
        "slice:classify",
        "waves:detect",
        "sync:reconcile",
        "sync:state",
        "worktree:create",
        "worktree:delete",
        "worktree:list",
        "review:record",
        "review:check-fresh",
        "checkpoint:save",
        "checkpoint:load"
      ]
    }
  }));
} else {
  console.log(JSON.stringify({
    ok: false,
    error: { code: "NOT_IMPLEMENTED", message: `Command "${command}" not yet implemented` }
  }));
}
