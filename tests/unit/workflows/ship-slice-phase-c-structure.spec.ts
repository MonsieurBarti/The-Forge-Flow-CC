import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ship-slice.md phase C structure", () => {
  const content = readFileSync(join(process.cwd(), "workflows", "ship-slice.md"), "utf8");

  it("step 0 uses routing:decide and no longer uses extract/select-tier", () => {
    expect(content).toContain("routing:decide");
    expect(content).not.toContain("routing:extract");
    expect(content).not.toContain("routing:select-tier");
  });

  it("stages 2–4 reference the captured decisions JSON for per-agent tier", () => {
    for (const agent of ["tff-spec-reviewer", "tff-code-reviewer", "tff-security-auditor"]) {
      expect(content).toContain(`<routing-decisions-json>[agent=${agent}].tier`);
    }
  });

  it("step 1 review:check-fresh unchanged", () => {
    expect(content).toContain(
      "`∀ reviewer: tff-tools review:check-fresh --slice-id <slice-id> --agent <role>`",
    );
  });

  it("step 5 PR creation unchanged", () => {
    expect(content).toContain("gh pr create");
    expect(content).toContain("slice/<slice-id>");
  });

  it("step 7 cleanup references unchanged", () => {
    expect(content).toContain("tff-tools worktree:delete --slice-id <slice-id>");
    expect(content).toContain("tff-tools slice:close --slice-id <slice-id>");
  });
});
