import { describe, expect, it } from "vitest";
import { isExempt, SKIPLIST } from "../../helpers/transaction-discipline/skiplist.js";

describe("isExempt", () => {
	it("returns false when SKIPLIST is empty", () => {
		expect(SKIPLIST).toHaveLength(0);
		expect(isExempt("/some/file.ts", 42, "someMethod")).toBe(false);
	});

	it("returns true when an entry matches (endsWith path, exact line, exact method)", () => {
		// Temporarily add an entry to the skiplist for testing
		const entry = {
			filePath: "/abs/path/to/some-file.ts",
			line: 99,
			methodName: "closeAdapter",
			reason: "lifecycle",
		};
		SKIPLIST.push(entry);
		try {
			expect(isExempt("path/to/some-file.ts", 99, "closeAdapter")).toBe(true);
		} finally {
			SKIPLIST.splice(SKIPLIST.indexOf(entry), 1);
		}
	});

	it("returns false when line does not match", () => {
		const entry = {
			filePath: "/abs/path/to/some-file.ts",
			line: 99,
			methodName: "closeAdapter",
			reason: "lifecycle",
		};
		SKIPLIST.push(entry);
		try {
			expect(isExempt("path/to/some-file.ts", 100, "closeAdapter")).toBe(false);
		} finally {
			SKIPLIST.splice(SKIPLIST.indexOf(entry), 1);
		}
	});

	it("returns false when method does not match", () => {
		const entry = {
			filePath: "/abs/path/to/some-file.ts",
			line: 99,
			methodName: "closeAdapter",
			reason: "lifecycle",
		};
		SKIPLIST.push(entry);
		try {
			expect(isExempt("path/to/some-file.ts", 99, "otherMethod")).toBe(false);
		} finally {
			SKIPLIST.splice(SKIPLIST.indexOf(entry), 1);
		}
	});
});
