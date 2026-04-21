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
	showAtHead: (relPath: string) => Promise<string>;
}

const makeGit = (opts: {
	dirty?: boolean;
	contentAtHead?: string;
	showError?: string;
}): GitStub => ({
	isPathDirty: async () => opts.dirty ?? false,
	showAtHead: async () => {
		if (opts.showError) throw new Error(opts.showError);
		return opts.contentAtHead ?? "";
	},
});

const cleanGit: GitStub = makeGit({ contentAtHead: "foo v2\n" });
const dirtyGit: GitStub = makeGit({ dirty: true, contentAtHead: "foo v2\n" });

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
			approvedDiffSha: "0".repeat(64),
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
			approvedDiffSha: "0".repeat(64),
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
			approvedDiffSha: sha,
		});

		expect(result).toEqual({
			ok: true,
			noop: true,
			data: {
				skillId: "foo",
				shaBefore: sha,
				shaAfter: sha,
				reason: "no-op",
				originalCommitSha: "origA",
				refinementId: null,
			},
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

		const newSha = computeSha("foo v2\n");
		const result = await approveSkill({
			skillId: "foo",
			reason: "manual refinement",
			root: tmp,
			git: cleanGit,
			now: () => new Date("2026-04-21T00:00:00Z"),
			approvedDiffSha: newSha,
		});

		expect(result).toEqual({
			ok: true,
			noop: false,
			data: {
				skillId: "foo",
				shaBefore: oldSha,
				shaAfter: newSha,
				reason: "manual refinement",
				originalCommitSha: "origA",
				refinementId: null,
			},
		});

		const after = readManifest(tmp);
		expect(after.skills.foo.sha256).toBe(newSha);
		expect(after.skills.foo.originalCommitSha).toBe("origA");
		expect(after.skills.foo.approvedAt).toBe("2026-04-21T00:00:00.000Z");
		expect(after.skills.foo.refinementId).toBeNull();
	});

	it("creates a manifest row when one does not exist yet", async () => {
		const newSha = computeSha("foo v2\n");
		const result = await approveSkill({
			skillId: "foo",
			reason: "first approval",
			root: tmp,
			git: cleanGit,
			now: () => new Date("2026-04-21T00:00:00Z"),
			seedOriginalCommitSha: "seedcommit",
			approvedDiffSha: newSha,
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
		const sha = computeSha("foo v2\n");
		writeManifest(tmp, {
			version: 1,
			skills: {
				foo: {
					sha256: sha,
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
			approvedDiffSha: sha,
		});

		expect(result).toEqual({
			ok: false,
			reason: "seedOriginalCommitSha is only valid for new rows; row for foo already exists",
		});
	});

	it("fails gracefully when showAtHead throws", async () => {
		const r = await approveSkill({
			skillId: "foo",
			reason: "r",
			root: tmp,
			git: makeGit({ showError: "fatal: bad object" }),
			now: () => new Date("2026-04-21T00:00:00Z"),
			approvedDiffSha: "0".repeat(64),
		});
		expect(r).toMatchObject({ ok: false });
		expect((r as { reason: string }).reason).toContain("unable to read committed content");
	});

	it("rejects skill ids with path-traversal characters", async () => {
		const r = await approveSkill({
			skillId: "../../etc/passwd",
			reason: "attack",
			root: tmp,
			git: makeGit({}),
			now: () => new Date("2026-04-21T00:00:00Z"),
			approvedDiffSha: "0".repeat(64),
		});
		expect(r).toMatchObject({ ok: false });
		expect((r as { reason: string }).reason).toContain("invalid skill id");
	});

	it("rejects empty skill id", async () => {
		const r = await approveSkill({
			skillId: "",
			reason: "r",
			root: tmp,
			git: makeGit({}),
			now: () => new Date("2026-04-21T00:00:00Z"),
			approvedDiffSha: "0".repeat(64),
		});
		expect(r).toMatchObject({ ok: false });
	});

	it("accepts conventional skill ids (lowercase, digits, hyphens)", async () => {
		fs.mkdirSync(path.join(tmp, "skills", "my-skill-42"), { recursive: true });
		fs.writeFileSync(path.join(tmp, "skills/my-skill-42/SKILL.md"), "hi\n");
		const newSha = computeSha("hi\n");
		const r = await approveSkill({
			skillId: "my-skill-42",
			reason: "init",
			root: tmp,
			git: makeGit({ contentAtHead: "hi\n" }),
			now: () => new Date("2026-04-21T00:00:00Z"),
			seedOriginalCommitSha: "seed",
			approvedDiffSha: newSha,
		});
		expect(r.ok).toBe(true);
	});

	it("rejects when approved-diff-sha does not match committed content", async () => {
		const r = await approveSkill({
			skillId: "foo",
			reason: "r",
			root: tmp,
			git: makeGit({ contentAtHead: "foo v2\n" }),
			now: () => new Date("2026-04-21T00:00:00Z"),
			approvedDiffSha: "0".repeat(64),
		});
		expect(r).toMatchObject({ ok: false });
		expect((r as { reason: string }).reason).toContain("approved-diff-sha mismatch");
	});

	it("appends an audit log entry on successful update", async () => {
		const oldSha = "0".repeat(64);
		writeManifest(tmp, {
			version: 1,
			skills: {
				foo: {
					sha256: oldSha,
					originalCommitSha: "origA",
					approvedAt: "2026-04-20T00:00:00.000Z",
					refinementId: "r1",
				},
			},
		});
		const newSha = computeSha("foo v2\n");
		const r = await approveSkill({
			skillId: "foo",
			reason: "manual refinement",
			root: tmp,
			git: makeGit({ contentAtHead: "foo v2\n" }),
			now: () => new Date("2026-04-21T00:00:00Z"),
			approvedDiffSha: newSha,
			refinementId: "refinement-42",
		});
		expect(r.ok).toBe(true);
		const log = fs.readFileSync(
			path.join(tmp, ".tff-cc/observations/skill-approvals.jsonl"),
			"utf8",
		);
		const entry = JSON.parse(log.trim());
		expect(entry).toMatchObject({
			skillId: "foo",
			reason: "manual refinement",
			shaBefore: oldSha,
			shaAfter: newSha,
			refinementId: "refinement-42",
			approvedDiffSha: newSha,
		});
	});

	it("does NOT write audit log on no-op", async () => {
		const sha = computeSha("foo v2\n");
		writeManifest(tmp, {
			version: 1,
			skills: {
				foo: {
					sha256: sha,
					originalCommitSha: "origA",
					approvedAt: "2026-04-20T00:00:00.000Z",
					refinementId: null,
				},
			},
		});
		const r = await approveSkill({
			skillId: "foo",
			reason: "noop",
			root: tmp,
			git: makeGit({ contentAtHead: "foo v2\n" }),
			now: () => new Date("2026-04-21T00:00:00Z"),
			approvedDiffSha: sha,
		});
		expect(r.ok).toBe(true);
		expect((r as { noop: boolean }).noop).toBe(true);
		expect(
			fs.existsSync(path.join(tmp, ".tff-cc/observations/skill-approvals.jsonl")),
		).toBe(false);
	});
});
