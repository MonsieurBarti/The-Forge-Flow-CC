import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonlRoutingOutcomeReader } from "../../../../../src/infrastructure/adapters/jsonl/routing-outcome-jsonl-reader.js";
import { JsonlRoutingOutcomeWriter } from "../../../../../src/infrastructure/adapters/jsonl/routing-outcome-jsonl-writer.js";
import type { RoutingOutcome } from "../../../../../src/domain/value-objects/routing-outcome.js";

const make = (over: Partial<RoutingOutcome>): RoutingOutcome => ({
  outcome_id: "00000000-0000-4000-8000-000000000001",
  decision_id: "00000000-0000-4000-8000-000000000002",
  dimension: "tier",
  verdict: "too-low",
  source: "manual",
  slice_id: "M01-S01",
  workflow_id: "tff:ship",
  emitted_at: "2026-04-19T10:00:00.000Z",
  ...over,
});

describe("JsonlRoutingOutcomeWriter + Reader", () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "routing-outcome-"));
    path = join(dir, "outcomes.jsonl");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("appends an outcome as one json line", async () => {
    const writer = new JsonlRoutingOutcomeWriter(path);
    await writer.append(make({}));
    const raw = await readFile(path, "utf8");
    expect(raw.split("\n").filter(Boolean)).toHaveLength(1);
    const parsed = JSON.parse(raw.trim());
    expect(parsed.dimension).toBe("tier");
  });

  it("reader yields all appended outcomes in order", async () => {
    const writer = new JsonlRoutingOutcomeWriter(path);
    await writer.append(make({ outcome_id: "00000000-0000-4000-8000-00000000000a" }));
    await writer.append(make({ outcome_id: "00000000-0000-4000-8000-00000000000b" }));
    const reader = new JsonlRoutingOutcomeReader(path);
    const collected: RoutingOutcome[] = [];
    for await (const o of reader.readOutcomes({})) collected.push(o);
    expect(collected.map((o) => o.outcome_id)).toEqual([
      "00000000-0000-4000-8000-00000000000a",
      "00000000-0000-4000-8000-00000000000b",
    ]);
  });

  it("reader treats missing file as empty", async () => {
    const reader = new JsonlRoutingOutcomeReader(join(dir, "missing.jsonl"));
    const collected: RoutingOutcome[] = [];
    for await (const o of reader.readOutcomes({})) collected.push(o);
    expect(collected).toEqual([]);
  });

  it("reader skips corrupt lines silently", async () => {
    const writer = new JsonlRoutingOutcomeWriter(path);
    await writer.append(make({}));
    await (await import("node:fs/promises")).appendFile(path, "not-json\n", "utf8");
    await writer.append(make({ outcome_id: "00000000-0000-4000-8000-00000000000c" }));
    const reader = new JsonlRoutingOutcomeReader(path);
    const collected: RoutingOutcome[] = [];
    for await (const o of reader.readOutcomes({})) collected.push(o);
    expect(collected).toHaveLength(2);
  });

  it("reader filter by source works", async () => {
    const writer = new JsonlRoutingOutcomeWriter(path);
    await writer.append(make({ source: "manual" }));
    await writer.append(
      make({ outcome_id: "00000000-0000-4000-8000-00000000000d", source: "debug-join", dimension: "unknown", verdict: "wrong" }),
    );
    const reader = new JsonlRoutingOutcomeReader(path);
    const collected: RoutingOutcome[] = [];
    for await (const o of reader.readOutcomes({ source: "manual" })) collected.push(o);
    expect(collected).toHaveLength(1);
    expect(collected[0].source).toBe("manual");
  });
});
