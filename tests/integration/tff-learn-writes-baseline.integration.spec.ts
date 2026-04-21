import crypto from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeSha,
  readManifest,
  writeManifest,
} from "../../src/application/skills/baseline-registry.js";
import { skillsApproveCmd } from "../../src/cli/commands/skills-approve.cmd.js";

// Simulates the `/tff:learn` workflow step 6 command sequence end-to-end.
// Proves that the documented sequence lands a correctly-updated manifest AND
// audit log without relying on the LLM refinement engine.
describe("/tff:learn command sequence", () => {
  let tmp: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tff-learn-int-"));
    execSync("git init --quiet", { cwd: tmp });
    execSync("git config user.email test@tff.invalid", { cwd: tmp });
    execSync("git config user.name test", { cwd: tmp });
    execSync("git config commit.gpgsign false", { cwd: tmp });

    // Seed: existing skill 'brainstorming' with v1 content + manifest row.
    fs.mkdirSync(path.join(tmp, "skills", "brainstorming"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "skills/brainstorming/SKILL.md"),
      "# Brainstorming v1\n\nOriginal content.\n",
    );
    execSync("git add .", { cwd: tmp });
    execSync('git commit -m "initial" --quiet', { cwd: tmp });

    const seedSha = execSync("git rev-parse HEAD", { cwd: tmp, encoding: "utf8" }).trim();
    writeManifest(tmp, {
      version: 1,
      skills: {
        brainstorming: {
          sha256: computeSha("# Brainstorming v1\n\nOriginal content.\n"),
          originalCommitSha: seedSha,
          approvedAt: "2026-04-20T00:00:00.000Z",
          refinementId: null,
        },
      },
    });
    execSync("git add skills/skill-baselines.json", { cwd: tmp });
    execSync('git commit -m "baseline" --quiet', { cwd: tmp });

    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("end-to-end: edit → commit → sha → approve → manifest + audit log", async () => {
    // Step 1: update SKILL.md with "the approved refinement"
    const refined = "# Brainstorming v2\n\nRefined content with a new step.\n";
    fs.writeFileSync(path.join(tmp, "skills/brainstorming/SKILL.md"), refined);

    // Step 2: commit the content change (so HEAD has the approved bytes)
    execSync("git add skills/brainstorming/SKILL.md", { cwd: tmp });
    execSync('git commit -m "apply refinement r-42" --quiet', { cwd: tmp });

    // Step 3: compute sha the way the workflow prescribes
    const approvedSha = crypto
      .createHash("sha256")
      .update(refined, "utf8")
      .digest("hex");

    // Step 4: run skills:approve
    const out = await skillsApproveCmd([
      "--id",
      "brainstorming",
      "--reason",
      "apply refinement r-42",
      "--approved-diff-sha",
      approvedSha,
      "--refinement-id",
      "r-42",
    ]);

    const parsed = JSON.parse(out) as {
      ok: boolean;
      data?: { refinementId: string | null; shaAfter: string; noop: boolean };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.data?.refinementId).toBe("r-42");
    expect(parsed.data?.shaAfter).toBe(approvedSha);
    expect(parsed.data?.noop).toBe(false);

    // Step 5: manifest row reflects the refinement
    const after = readManifest(tmp);
    expect(after.skills.brainstorming.sha256).toBe(approvedSha);
    expect(after.skills.brainstorming.refinementId).toBe("r-42");

    // Step 6: audit log has one entry for this refinement
    const log = fs
      .readFileSync(
        path.join(tmp, ".tff-cc/observations/skill-approvals.jsonl"),
        "utf8",
      )
      .trim();
    const entry = JSON.parse(log);
    expect(entry).toMatchObject({
      skillId: "brainstorming",
      reason: "apply refinement r-42",
      refinementId: "r-42",
      approvedDiffSha: approvedSha,
      shaAfter: approvedSha,
    });
  });
});
