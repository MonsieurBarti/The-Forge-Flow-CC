import { describe, expect, it } from "vitest";
import { depAddSchema } from "../../../../src/cli/commands/dep-add.cmd.js";
import { parseFlags } from "../../../../src/cli/utils/flag-parser.js";

describe("depAddSchema — slice type flag", () => {
  it("accepts --type slice", () => {
    const result = parseFlags(
      ["--from-id", "M01-S02", "--to-id", "M01-S01", "--type", "slice"],
      depAddSchema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.data as { type: string }).type).toBe("slice");
  });

  it("accepts --type task (explicit)", () => {
    const result = parseFlags(
      ["--from-id", "some-task-id", "--to-id", "another-task-id", "--type", "task"],
      depAddSchema,
    );
    expect(result.ok).toBe(true);
  });

  it("defaults to task when --type is omitted", () => {
    const result = parseFlags(
      ["--from-id", "some-task-id", "--to-id", "another-task-id"],
      depAddSchema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { type?: string };
      expect(data.type).toBeUndefined();
    }
  });

  it("rejects invalid --type value", () => {
    const result = parseFlags(
      ["--from-id", "x", "--to-id", "y", "--type", "project"],
      depAddSchema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_ENUM_VALUE");
  });
});
