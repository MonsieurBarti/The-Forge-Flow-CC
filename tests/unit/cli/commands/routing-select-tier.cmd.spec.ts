import { describe, expect, it } from "vitest";
import { routingSelectTierCmd } from "../../../../src/cli/commands/routing-select-tier.cmd.js";

const LOW_SIGNALS = JSON.stringify({ complexity: "low", risk: { level: "low", tags: [] } });

describe("routing:select-tier", () => {
  it("exits 0 and returns skipped when routing disabled (no settings.yaml in cwd)", async () => {
    const out = await routingSelectTierCmd([
      "--slice-id", "M01-S01",
      "--agent", "tff-code-reviewer",
      "--signals", LOW_SIGNALS,
    ]);
    const parsed = JSON.parse(out);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.skipped).toBe(true);
  });

  it("returns error for missing required flags", async () => {
    const out = await routingSelectTierCmd(["--slice-id", "M01-S01"]);
    const parsed = JSON.parse(out);
    expect(parsed.ok).toBe(false);
  });

  it("returns error for invalid signals JSON", async () => {
    const out = await routingSelectTierCmd([
      "--slice-id", "M01-S01",
      "--agent", "tff-code-reviewer",
      "--signals", "not-valid-json",
    ]);
    const parsed = JSON.parse(out);
    expect(parsed.ok).toBe(false);
  });
});
