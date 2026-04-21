import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	auditDeadLetter,
	checkFirstObservationSentinel,
	checkLastObservation,
} from "../../../../src/application/observations/health-checks.js";

describe("checkLastObservation", () => {
	let tmp: string;

	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "obs-health-"));
	});

	afterEach(() => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("returns present: false when sessions.jsonl missing", () => {
		const r = checkLastObservation(tmp, new Date("2026-04-21T00:00:00Z"), 14);
		expect(r).toEqual({ ok: true, present: false, lastSeenAt: null, stale: false });
	});

	it("returns stale: false when last entry is younger than staleAfterDays", () => {
		fs.mkdirSync(path.join(tmp, ".tff-cc/observations"), { recursive: true });
		fs.writeFileSync(
			path.join(tmp, ".tff-cc/observations/sessions.jsonl"),
			`${JSON.stringify({ ts: "2026-04-14T00:00:00Z", tool: "Read" })}\n`,
		);
		const r = checkLastObservation(tmp, new Date("2026-04-21T00:00:00Z"), 14);
		expect(r).toMatchObject({
			ok: true,
			present: true,
			stale: false,
			lastSeenAt: "2026-04-14T00:00:00Z",
		});
	});

	it("returns stale: true when last entry is older than staleAfterDays", () => {
		fs.mkdirSync(path.join(tmp, ".tff-cc/observations"), { recursive: true });
		fs.writeFileSync(
			path.join(tmp, ".tff-cc/observations/sessions.jsonl"),
			`${JSON.stringify({ ts: "2026-03-01T00:00:00Z", tool: "Read" })}\n`,
		);
		const r = checkLastObservation(tmp, new Date("2026-04-21T00:00:00Z"), 14);
		expect(r).toMatchObject({ ok: true, present: true, stale: true });
	});

	it("swallows malformed JSONL into { ok: false, reason }", () => {
		fs.mkdirSync(path.join(tmp, ".tff-cc/observations"), { recursive: true });
		fs.writeFileSync(
			path.join(tmp, ".tff-cc/observations/sessions.jsonl"),
			"nope\nbad\nstill-bad\nwrong\nno-good\n",
		);
		const r = checkLastObservation(tmp, new Date(), 14);
		expect(r.ok).toBe(false);
	});

	it("walks back past a truncated last line", () => {
		fs.mkdirSync(path.join(tmp, ".tff-cc/observations"), { recursive: true });
		fs.writeFileSync(
			path.join(tmp, ".tff-cc/observations/sessions.jsonl"),
			`${JSON.stringify({ ts: "2026-04-14T00:00:00Z", tool: "Read" })}\n{"ts":"broken`,
		);
		const r = checkLastObservation(tmp, new Date("2026-04-21T00:00:00Z"), 14);
		expect(r).toMatchObject({
			ok: true,
			present: true,
			stale: false,
			lastSeenAt: "2026-04-14T00:00:00Z",
		});
	});

	it("returns present: false when sessions.jsonl is empty", () => {
		fs.mkdirSync(path.join(tmp, ".tff-cc/observations"), { recursive: true });
		fs.writeFileSync(path.join(tmp, ".tff-cc/observations/sessions.jsonl"), "");
		const r = checkLastObservation(tmp, new Date("2026-04-21T00:00:00Z"), 14);
		expect(r).toEqual({ ok: true, present: false, lastSeenAt: null, stale: false });
	});

	it("handles file with no trailing newline", () => {
		fs.mkdirSync(path.join(tmp, ".tff-cc/observations"), { recursive: true });
		fs.writeFileSync(
			path.join(tmp, ".tff-cc/observations/sessions.jsonl"),
			JSON.stringify({ ts: "2026-04-20T00:00:00Z" }),
		);
		const r = checkLastObservation(tmp, new Date("2026-04-21T00:00:00Z"), 14);
		expect(r).toMatchObject({ ok: true, present: true, stale: false });
	});
});

describe("checkFirstObservationSentinel", () => {
	let tmp: string;

	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "obs-sentinel-"));
	});

	afterEach(() => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("does not warn when settings.yaml missing", () => {
		const r = checkFirstObservationSentinel(tmp);
		expect(r).toMatchObject({ ok: true, enabled: false, shouldWarn: false });
	});

	it("warns when enabled + mutating sentinel exists + sessions.jsonl missing", () => {
		fs.mkdirSync(path.join(tmp, ".tff-cc/observations"), { recursive: true });
		fs.writeFileSync(path.join(tmp, ".tff-cc/settings.yaml"), "enabled: true\n");
		fs.writeFileSync(path.join(tmp, ".tff-cc/observations/.mutating-cli-ran"), "");
		const r = checkFirstObservationSentinel(tmp);
		expect(r).toMatchObject({
			ok: true,
			enabled: true,
			sessionsFileExists: false,
			mutatingCliEverRan: true,
			shouldWarn: true,
		});
	});

	it("does not warn when sessions.jsonl exists", () => {
		fs.mkdirSync(path.join(tmp, ".tff-cc/observations"), { recursive: true });
		fs.writeFileSync(path.join(tmp, ".tff-cc/settings.yaml"), "enabled: true\n");
		fs.writeFileSync(path.join(tmp, ".tff-cc/observations/.mutating-cli-ran"), "");
		fs.writeFileSync(path.join(tmp, ".tff-cc/observations/sessions.jsonl"), "");
		const r = checkFirstObservationSentinel(tmp);
		expect(r).toMatchObject({ ok: true, shouldWarn: false });
	});

	it("does not warn when enabled is commented out in settings.yaml", () => {
		fs.mkdirSync(path.join(tmp, ".tff-cc/observations"), { recursive: true });
		fs.writeFileSync(path.join(tmp, ".tff-cc/settings.yaml"), "# enabled: true\n");
		fs.writeFileSync(path.join(tmp, ".tff-cc/observations/.mutating-cli-ran"), "");
		const r = checkFirstObservationSentinel(tmp);
		expect(r).toMatchObject({ ok: true, enabled: false, shouldWarn: false });
	});
});

describe("auditDeadLetter", () => {
	let tmp: string;

	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "obs-dl-"));
	});

	afterEach(() => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("reports present: false when dead-letter.jsonl missing", () => {
		const r = auditDeadLetter(tmp);
		expect(r).toMatchObject({ ok: true, present: false, entryCount: 0, bytes: 0 });
	});

	it("reports line count and bytes when non-empty", () => {
		fs.mkdirSync(path.join(tmp, ".tff-cc/observations"), { recursive: true });
		const dl = path.join(tmp, ".tff-cc/observations/dead-letter.jsonl");
		fs.writeFileSync(dl, "line-a\nline-b\nline-c\n");
		const r = auditDeadLetter(tmp);
		expect(r).toMatchObject({ ok: true, present: true, entryCount: 3, entryCountTruncated: false });
		expect((r as { bytes: number }).bytes).toBeGreaterThan(0);
	});
});
