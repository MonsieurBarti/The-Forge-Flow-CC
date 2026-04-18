import { describe, expect, it } from "vitest";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

describe("v4 migration — slice_dependency table", () => {
  it("creates the slice_dependency table", () => {
    const adapter = SQLiteStateAdapter.createInMemory();
    adapter.init();
    // Access private db via cast for test introspection
    const db = (adapter as unknown as { db: import("better-sqlite3").Database }).db;
    const tableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='slice_dependency'",
      )
      .get();
    expect(tableExists).toBeDefined();
  });

  it("enforces PRIMARY KEY uniqueness on (from_id, to_id)", () => {
    const adapter = SQLiteStateAdapter.createInMemory();
    adapter.init();
    const db = (adapter as unknown as { db: import("better-sqlite3").Database }).db;
    db.prepare(
      "INSERT INTO project (id, name, created_at, updated_at) VALUES ('singleton', 'Test', datetime('now'), datetime('now'))",
    ).run();
    db.prepare(
      "INSERT INTO milestone (id, project_id, number, name, status, branch, created_at, updated_at) VALUES ('m-uuid-1', 'singleton', 1, 'M1', 'open', 'branch-1', datetime('now'), datetime('now'))",
    ).run();
    db.prepare(
      "INSERT INTO slice (id, milestone_id, number, title, status, created_at, updated_at) VALUES ('s-uuid-1', 'm-uuid-1', 1, 'S1', 'discussing', datetime('now'), datetime('now'))",
    ).run();
    db.prepare(
      "INSERT INTO slice (id, milestone_id, number, title, status, created_at, updated_at) VALUES ('s-uuid-2', 'm-uuid-1', 2, 'S2', 'discussing', datetime('now'), datetime('now'))",
    ).run();
    db.prepare(
      "INSERT INTO slice_dependency (from_id, to_id) VALUES ('s-uuid-2', 's-uuid-1')",
    ).run();
    expect(() =>
      db
        .prepare("INSERT INTO slice_dependency (from_id, to_id) VALUES ('s-uuid-2', 's-uuid-1')")
        .run(),
    ).toThrow();
  });
});
