import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { touchMutatingSentinel } from "../../../../src/cli/utils/with-mutating-command.js";

describe("touchMutatingSentinel", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mutating-sentinel-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("creates the sentinel file on first call", () => {
    touchMutatingSentinel(tmp);
    expect(fs.existsSync(path.join(tmp, ".tff-cc/observations/.mutating-cli-ran"))).toBe(true);
  });

  it("is idempotent on repeated calls", () => {
    touchMutatingSentinel(tmp);
    touchMutatingSentinel(tmp);
    expect(fs.existsSync(path.join(tmp, ".tff-cc/observations/.mutating-cli-ran"))).toBe(true);
  });

  it("swallows errors silently (non-fatal to mutating commands)", () => {
    // Non-writable path simulation. The function must not throw.
    expect(() => touchMutatingSentinel("/does/not/exist/definitely")).not.toThrow();
  });
});
