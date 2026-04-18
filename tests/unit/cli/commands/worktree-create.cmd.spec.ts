import { describe, expect, it } from "vitest";
import { worktreeCreateSchema } from "../../../../src/cli/commands/worktree-create.cmd.js";
import { parseFlags } from "../../../../src/cli/utils/flag-parser.js";

describe("worktreeCreateSchema — flag parsing", () => {
  it("accepts a display label (M01-S01)", () => {
    const result = parseFlags(["--slice-id", "M01-S01"], worktreeCreateSchema);
    expect(result.ok).toBe(true);
  });

  it("accepts a UUID", () => {
    const result = parseFlags(
      ["--slice-id", "a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
      worktreeCreateSchema,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects invalid format", () => {
    const result = parseFlags(["--slice-id", "garbage!!"], worktreeCreateSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PATTERN_MISMATCH");
  });
});
