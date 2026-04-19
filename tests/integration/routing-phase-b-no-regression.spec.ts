import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ship-slice.md no-regression: steps 1–8 unchanged", () => {
  const content = readFileSync(join(process.cwd(), "workflows", "ship-slice.md"), "utf8");

  it("contains step 1 review:check-fresh unchanged", () => {
    expect(content).toContain(
      "`∀ reviewer: tff-tools review:check-fresh --slice-id <slice-id> --agent <role>`",
    );
  });

  it("contains step 5 PR creation unchanged", () => {
    expect(content).toContain("gh pr create");
    expect(content).toContain("slice/<slice-id>");
  });

  it("step 0 references both routing:extract and routing:select-tier", () => {
    expect(content).toContain("routing:extract");
    expect(content).toContain("routing:select-tier");
  });
});
