import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
import { findUnwrappedMutations } from "../../../helpers/transaction-discipline/find-unwrapped-mutations.js";
import { isExempt, SKIPLIST } from "../../../helpers/transaction-discipline/skiplist.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("transaction-wrap discipline (real codebase)", () => {
	// ts-morph loads the entire tsconfig project; under parallel suite execution
	// (especially with typecheck running in the same lefthook pre-push cycle)
	// this can take well over a minute. Give it plenty of headroom.
	it("every mutating store call in src/cli/commands is inside withTransaction or explicitly exempt", {
		timeout: 120_000,
	}, () => {
		const project = new Project({
			tsConfigFilePath: `${REPO}/tsconfig.json`,
			skipAddingFilesFromTsConfig: false,
		});

		const globs = [`${REPO}/src/cli/commands/**/*.ts`];
		const violations = findUnwrappedMutations(project, globs);

		const unexplained = violations.filter((v) => !isExempt(v.filePath, v.line, v.methodName));

		if (unexplained.length > 0) {
			const report = unexplained
				.map((v) => `  - ${v.filePath}:${v.line}  ${v.receiverType}.${v.methodName}(...)`)
				.join("\n");
			throw new Error(
				`Found ${unexplained.length} unwrapped mutating store call(s):\n${report}\n\n` +
					`Either wrap the call in withTransaction(...) or add an entry to ` +
					`tests/helpers/transaction-discipline/skiplist.ts with a one-line reason.\n` +
					`Note: enforcement is scoped to src/cli/commands/** only.`,
			);
		}

		expect(unexplained).toEqual([]);
		expect(SKIPLIST.length).toBeLessThan(20); // soft cap; exemption list should stay small
	});
});
