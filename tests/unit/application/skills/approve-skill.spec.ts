import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { approveSkill } from "../../../../src/application/skills/approve-skill.js";
import {
	computeSha,
	readManifest,
	writeManifest,
} from "../../../../src/application/skills/baseline-registry.js";

interface GitStub {
	isPathDirty: (relPath: string) => Promise<boolean>;
}

const cleanGit: GitStub = { isPathDirty: async () => false };
const dirtyGit: GitStub = { isPathDirty: async () => true };

describe("approveSkill", () => {
	let tmp: string;

	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "approve-skill-"));
		fs.mkdirSync(path.join(tmp, "skills", "foo"), { recursive: true });
		fs.writeFileSync(path.join(tmp, "skills/foo/SKILL.md"), "foo v2\n");
	});

	afterEach(() => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("returns { ok: false, reason } when skill dir missing", async () => {
		const result = await approveSkill({
			skillId: "does-not-exist",
			reason: "r",
			root: tmp,
			git: cleanGit,
			now: () => new Date("2026-04-21T00:00:00Z"),
		});
		expect(result).toEqual({
			ok: false,
			reason: "skill not found: does-not-exist",
		});
	});

	it("refuses when working tree is dirty for the target file", async () => {
		const result = await approveSkill({
			skillId: "foo",
			reason: "r",
			root: tmp,
			git: dirtyGit,
			now: () => new Date("2026-04-21T00:00:00Z"),
		});
		expect(result).toEqual({
			ok: false,
			reason:
				"skills/foo/SKILL.md has uncommitted changes; commit the content change first, then re-run skills:approve",
		});
	});

	it("is a no-op when manifest row already matches current sha", async () => {
		const sha = computeSha("foo v2\n");
		writeManifest(tmp, {
			version: 1,
			skills: {
				foo: {
					sha256: sha,
					originalCommitSha: "origA",
					approvedAt: "2026-04-20T00:00:00Z",
					refinementId: null,
				},
			},
		});

		const result = await approveSkill({
			skillId: "foo",
			reason: "no-op",
			root: tmp,
			git: cleanGit,
			now: () => new Date("2026-04-21T00:00:00Z"),
		});

		expect(result).toEqual({
			ok: true,
			noop: true,
			data: { skillId: "foo", shaBefore: sha, shaAfter: sha, reason: "no-op", originalCommitSha: "origA" },
		});

		const after = readManifest(tmp);
		expect(after.skills.foo.approvedAt).toBe("2026-04-20T00:00:00Z"); // unchanged
	});

	it("updates sha256 and approvedAt on mismatch, leaves originalCommitSha intact", async () => {
		const oldSha = "0".repeat(64);
		writeManifest(tmp, {
			version: 1,
			skills: {
				foo: {
					sha256: oldSha,
					originalCommitSha: "origA",
					approvedAt: "2026-04-20T00:00:00Z",
					refinementId: "r1",
				},
			},
		});

		const result = await approveSkill({
			skillId: "foo",
			reason: "manual refinement",
			root: tmp,
			git: cleanGit,
			now: () => new Date("2026-04-21T00:00:00Z"),
		});

		const newSha = computeSha("foo v2\n");
		expect(result).toEqual({
			ok: true,
			noop: false,
			data: {
				skillId: "foo",
				shaBefore: oldSha,
				shaAfter: newSha,
				reason: "manual refinement",
				originalCommitSha: "origA",
			},
		});

		const after = readManifest(tmp);
		expect(after.skills.foo.sha256).toBe(newSha);
		expect(after.skills.foo.originalCommitSha).toBe("origA");
		expect(after.skills.foo.approvedAt).toBe("2026-04-21T00:00:00.000Z");
		expect(after.skills.foo.refinementId).toBeNull();
	});

	it("creates a manifest row when one does not exist yet", async () => {
		const result = await approveSkill({
			skillId: "foo",
			reason: "first approval",
			root: tmp,
			git: cleanGit,
			now: () => new Date("2026-04-21T00:00:00Z"),
			seedOriginalCommitSha: "seedcommit",
		});

		expect(result.ok).toBe(true);
		const after = readManifest(tmp);
		expect(after.skills.foo.originalCommitSha).toBe("seedcommit");
		expect(after.skills.foo.sha256).toBe(computeSha("foo v2\n"));
		expect(after.skills.foo.approvedAt).toBe("2026-04-21T00:00:00.000Z");
		expect(after.skills.foo.refinementId).toBeNull();
		const successResult = result as { ok: true; data: { originalCommitSha: string } };
		expect(successResult.data.originalCommitSha).toBe("seedcommit");
	});

	it("rejects seedOriginalCommitSha when the row already exists", async () => {
		writeManifest(tmp, {
			version: 1,
			skills: {
				foo: {
					sha256: computeSha("foo v2\n"),
					originalCommitSha: "origA",
					approvedAt: "2026-04-20T00:00:00.000Z",
					refinementId: null,
				},
			},
		});

		const result = await approveSkill({
			skillId: "foo",
			reason: "r",
			root: tmp,
			git: cleanGit,
			now: () => new Date("2026-04-21T00:00:00Z"),
			seedOriginalCommitSha: "should-not-be-used",
		});

		expect(result).toEqual({
			ok: false,
			reason:
				"seedOriginalCommitSha is only valid for new rows; row for foo already exists",
		});
	});
});
