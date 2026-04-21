// tests/unit/infrastructure/adapters/sqlite/native-binding-error.spec.ts
import { describe, expect, it } from "vitest";
import { NativeBindingError } from "../../../../../src/infrastructure/adapters/sqlite/native-binding-error.js";

describe("NativeBindingError", () => {
  it("carries structured details and a human-readable message", () => {
    const err = new NativeBindingError({
      platform: "darwin",
      arch: "arm64",
      nodeAbi: "127",
      candidates: [
        { path: "/a/prebuilt.node", source: "prebuilt", reason: "ABI mismatch" },
        { path: "/b/local.node", source: "local", reason: "ENOENT" },
      ],
    });
    expect(err.code).toBe("NATIVE_BINDING_FAILED");
    expect(err.message).toContain("/a/prebuilt.node");
    expect(err.message).toContain("ABI mismatch");
    expect(err.details.remediation).toMatch(/bun install --force better-sqlite3/);
  });

  it("toJSON emits the structured envelope", () => {
    const err = new NativeBindingError({
      platform: "darwin",
      arch: "arm64",
      nodeAbi: "127",
      candidates: [],
    });
    const json = err.toJSON();
    expect(json.code).toBe("NATIVE_BINDING_FAILED");
    expect(json.message).toBeTypeOf("string");
    expect(json.details.platform).toBe("darwin");
    expect(json.details.candidates).toEqual([]);
  });
});
