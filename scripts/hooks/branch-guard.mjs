#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

if (process.env.TFF_ALLOW_MILESTONE_COMMIT === "1") process.exit(0);

const cwd = process.cwd();
if (!existsSync(join(cwd, ".tff-project-id"))) process.exit(0);

const cliPath = join(cwd, "dist/cli/index.js");
if (!existsSync(cliPath)) process.exit(0); // build not produced yet — cannot verify; don't block

let out;
try {
  out = execSync(`node ${cliPath} branch-guard:check`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
  // CLI failed (not a refusal — an actual failure) — don't block the commit, print stderr
  process.stderr.write(`branch-guard:check crashed: ${e}\n`);
  process.exit(0);
}

const parsed = JSON.parse(out.trim().split("\n").pop());
if (!parsed.ok && parsed.error.code === "REFUSED_ON_MILESTONE_BRANCH") {
  process.stderr.write(`${parsed.error.message}\n`);
  process.exit(1);
}
process.exit(0);
