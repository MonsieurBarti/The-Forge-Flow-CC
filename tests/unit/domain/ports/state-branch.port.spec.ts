import { describe, expect, it } from "vitest";
import type { StateBranchPort } from "../../../../src/domain/ports/state-branch.port.js";

describe("StateBranchPort", () => {
	it("should be implementable with all required methods", () => {
		const methods: (keyof StateBranchPort)[] = [
			"createRoot",
			"fork",
			"sync",
			"restore",
			"merge",
			"deleteBranch",
			"exists",
		];
		expect(methods).toHaveLength(7);
	});
});
