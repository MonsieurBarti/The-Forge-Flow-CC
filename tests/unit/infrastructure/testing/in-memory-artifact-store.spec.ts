import { describe, expect, it } from "vitest";
import { InMemoryArtifactStore } from "../../../../src/infrastructure/testing/in-memory-artifact-store.js";

describe("InMemoryArtifactStore", () => {
	it("reads back a written file", async () => {
		const store = new InMemoryArtifactStore();
		await store.write("src/file.ts", "content");
		const r = await store.read("src/file.ts");
		expect(r.ok).toBe(true);
		if (!r.ok) throw new Error("expected ok");
		expect(r.data).toBe("content");
	});

	it("returns NOT_FOUND for missing file", async () => {
		const store = new InMemoryArtifactStore();
		const r = await store.read("missing.ts");
		expect(r.ok).toBe(false);
		if (r.ok) throw new Error("expected error");
		expect(r.error.code).toBe("NOT_FOUND");
	});

	it("simulateWriteFailure causes write to return WRITE_FAILURE", async () => {
		const store = new InMemoryArtifactStore();
		store.simulateWriteFailure("fail.ts");
		const r = await store.write("fail.ts", "content");
		expect(r.ok).toBe(false);
		if (r.ok) throw new Error("expected error");
		expect(r.error.code).toBe("WRITE_FAILURE");
	});

	it("exists returns true for a written file", async () => {
		const store = new InMemoryArtifactStore();
		await store.write("src/a.ts", "x");
		expect(await store.exists("src/a.ts")).toBe(true);
	});

	it("exists returns false for a missing file", async () => {
		const store = new InMemoryArtifactStore();
		expect(await store.exists("nope.ts")).toBe(false);
	});

	it("list returns files with matching prefix", async () => {
		const store = new InMemoryArtifactStore();
		await store.write("src/a.ts", "a");
		await store.write("src/b.ts", "b");
		await store.write("tests/c.ts", "c");
		const r = await store.list("src");
		expect(r.ok).toBe(true);
		if (!r.ok) throw new Error("expected ok");
		expect(r.data).toHaveLength(2);
		expect(r.data).toEqual(expect.arrayContaining(["src/a.ts", "src/b.ts"]));
	});

	it("mkdir always succeeds", async () => {
		const store = new InMemoryArtifactStore();
		const r = await store.mkdir("/some/dir");
		expect(r.ok).toBe(true);
	});

	it("reset clears all files", async () => {
		const store = new InMemoryArtifactStore();
		await store.write("src/a.ts", "x");
		store.reset();
		expect(await store.exists("src/a.ts")).toBe(false);
	});

	it("seed populates files", async () => {
		const store = new InMemoryArtifactStore();
		store.seed({ "src/a.ts": "hello", "src/b.ts": "world" });
		const r = await store.read("src/a.ts");
		expect(r.ok).toBe(true);
		if (!r.ok) throw new Error("expected ok");
		expect(r.data).toBe("hello");
	});

	it("getAll returns a copy of all files", async () => {
		const store = new InMemoryArtifactStore();
		await store.write("src/x.ts", "x");
		const all = store.getAll();
		expect(all.get("src/x.ts")).toBe("x");
	});
});
