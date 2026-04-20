import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
import { findUnwrappedMutations } from "../../../helpers/transaction-discipline/find-unwrapped-mutations.js";

const mkProject = (files: Record<string, string>): Project => {
	const p = new Project({ useInMemoryFileSystem: true });
	for (const [path, contents] of Object.entries(files)) {
		p.createSourceFile(path, contents);
	}
	return p;
};

// Minimal store-port stub that every fixture reuses.
const PORT_STUB = `
  export interface SliceStore {
    createSlice(input: unknown): { ok: true } | { ok: false };
    listSlices(milestoneId: string): { ok: true; data: unknown[] } | { ok: false };
  }
`;
const WITH_TX_STUB = `
  export const withTransaction = async <T>(
    runner: unknown,
    body: () => { data: T; tmpRenames: [string, string][] },
  ) => body();
`;

describe("findUnwrappedMutations", () => {
	it("flags a mutating call outside withTransaction", () => {
		const project = mkProject({
			"/ports.ts": PORT_STUB,
			"/tx.ts": WITH_TX_STUB,
			"/src/application/foo.ts": `
        import { SliceStore } from "/ports.ts";
        export const foo = (store: SliceStore) => {
          store.createSlice({});
        };
      `,
		});
		const violations = findUnwrappedMutations(project, ["/src/application/**/*.ts"]);
		expect(violations).toHaveLength(1);
		expect(violations[0].methodName).toBe("createSlice");
		expect(violations[0].filePath).toBe("/src/application/foo.ts");
	});

	it("accepts a mutating call inside withTransaction body", () => {
		const project = mkProject({
			"/ports.ts": PORT_STUB,
			"/tx.ts": WITH_TX_STUB,
			"/src/application/bar.ts": `
        import { SliceStore } from "/ports.ts";
        import { withTransaction } from "/tx.ts";
        export const bar = async (runner: unknown, store: SliceStore) => {
          await withTransaction(runner, () => {
            store.createSlice({});
            return { data: undefined, tmpRenames: [] };
          });
        };
      `,
		});
		const violations = findUnwrappedMutations(project, ["/src/application/**/*.ts"]);
		expect(violations).toHaveLength(0);
	});

	it("ignores non-store method calls whose names start with mutating prefixes", () => {
		const project = mkProject({
			"/src/application/baz.ts": `
        export const baz = () => {
          const arr = [1, 2, 3];
          arr.slice(0, 1); // name starts with 's' but not a prefix; ignored regardless
          const obj = { createSomething: () => 0 };
          obj.createSomething(); // no store-port type in scope
        };
      `,
		});
		const violations = findUnwrappedMutations(project, ["/src/application/**/*.ts"]);
		expect(violations).toHaveLength(0);
	});

	it("ignores read-only calls on store ports", () => {
		const project = mkProject({
			"/ports.ts": PORT_STUB,
			"/src/application/qux.ts": `
        import { SliceStore } from "/ports.ts";
        export const qux = (store: SliceStore) => store.listSlices("M01");
      `,
		});
		const violations = findUnwrappedMutations(project, ["/src/application/**/*.ts"]);
		expect(violations).toHaveLength(0);
	});
});
