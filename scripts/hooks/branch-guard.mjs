#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

if (process.env.TFF_ALLOW_MILESTONE_COMMIT === "1") process.exit(0);

const cwd = process.cwd();
const idFile = join(cwd, ".tff-project-id");
if (!existsSync(idFile)) process.exit(0);

let branch;
try {
  branch = execSync("git symbolic-ref --short HEAD", { cwd, encoding: "utf8" }).trim();
} catch {
  process.exit(0);
}
if (!/^milestone\/[0-9a-f]{8}$/.test(branch)) process.exit(0);

const prefix = branch.split("/")[1];
const projectId = readFileSync(idFile, "utf8").trim();
const home = process.env.TFF_CC_HOME ?? join(homedir(), ".tff-cc");
const dbPath = join(home, projectId, "state.db");
if (!existsSync(dbPath)) process.exit(0);

const db = new Database(dbPath, { readonly: true });
try {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM slice s
       WHERE s.milestone_id LIKE ? AND s.status != 'closed'`,
    )
    .get(`${prefix}%`);
  if (row && row.n > 0) {
    process.stderr.write(
      `BRANCH_GUARD_VIOLATION: Working directly on milestone branch '${branch}' while ${row.n} slice(s) are open. Switch to the slice worktree at .tff-cc/worktrees/<slice-id>/. Override with TFF_ALLOW_MILESTONE_COMMIT=1.\n`,
    );
    process.exit(1);
  }
} finally {
  db.close();
}

process.exit(0);
