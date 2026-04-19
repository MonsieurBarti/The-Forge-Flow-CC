import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { routingDecideCmd } from "../../src/cli/commands/routing-decide.cmd.js";

let tmp: string;
let originalCwd: string;

const setupProject = async () => {
  tmp = await mkdtemp(join(tmpdir(), "routing-phase-c-"));
  await mkdir(join(tmp, ".tff-cc", "logs"), { recursive: true });
  await mkdir(join(tmp, "agents"), { recursive: true });
  await mkdir(join(tmp, "commands", "tff"), { recursive: true });
  await writeFile(
    join(tmp, ".tff-cc", "settings.yaml"),
    `routing:\n  enabled: true\n  confidence_threshold: 0.5\n  tier_policy:\n    low: haiku\n    medium: sonnet\n    high: opus\n  logging:\n    path: .tff-cc/logs/routing.jsonl\n`,
  );
  const agent = (id: string, handles: string, priority: number) =>
    `---\nname: ${id}\nmodel: opus\nrouting:\n  handles: [${handles}]\n  priority: ${priority}\n  min_tier: haiku\n---\n\n# ${id}\n`;
  await writeFile(
    join(tmp, "agents", "tff-spec-reviewer.md"),
    agent("tff-spec-reviewer", "standard_review", 10),
  );
  await writeFile(
    join(tmp, "agents", "tff-code-reviewer.md"),
    agent("tff-code-reviewer", "standard_review, code_quality", 10),
  );
  await writeFile(
    join(tmp, "agents", "tff-security-auditor.md"),
    agent("tff-security-auditor", "high_risk, auth", 20),
  );
  await writeFile(
    join(tmp, "commands", "tff", "ship.md"),
    `---\nname: tff:ship\nrouting:\n  pool:\n    - tff-spec-reviewer\n    - tff-code-reviewer\n    - tff-security-auditor\n---\n\nbody\n`,
  );
};

describe("routing phase C — /tff:ship integration", () => {
  beforeEach(async () => {
    originalCwd = process.cwd();
    await setupProject();
    process.chdir(tmp);
  });
  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(tmp, { recursive: true, force: true });
  });

  it("returns 3-decision JSON and logs extract + 3×(route, tier) in order", async () => {
    const out = await routingDecideCmd([
      "--slice-id",
      "M01-S01",
      "--workflow",
      "tff:ship",
      "--json",
    ]);
    const parsed = JSON.parse(out);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.decisions).toHaveLength(3);
    expect(parsed.data.decisions.map((d: { agent: string }) => d.agent)).toEqual([
      "tff-spec-reviewer",
      "tff-code-reviewer",
      "tff-security-auditor",
    ]);
    for (const d of parsed.data.decisions) {
      expect(d.tier).toMatch(/^(haiku|sonnet|opus)$/);
      expect(d.route_decision_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(d.tier_decision_id).toMatch(/^[0-9a-f-]{36}$/);
    }

    const raw = await readFile(join(tmp, ".tff-cc", "logs", "routing.jsonl"), "utf8");
    const lines = raw.trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.map((l) => l.kind)).toEqual([
      "extract",
      "route",
      "tier",
      "route",
      "tier",
      "route",
      "tier",
    ]);
    const routeIds = lines.filter((l) => l.kind === "route").map((l) => l.decision.decision_id);
    expect(new Set(routeIds).size).toBe(3);
  });
});
