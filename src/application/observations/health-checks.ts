import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const OBS_DIR = ".tff-cc/observations";
const SESSIONS = `${OBS_DIR}/sessions.jsonl`;
const DEAD_LETTER = `${OBS_DIR}/dead-letter.jsonl`;
const MUTATING_SENTINEL = `${OBS_DIR}/.mutating-cli-ran`;
const SETTINGS = ".tff-cc/settings.yaml";

const MAX_TAIL_BYTES = 64 * 1024;

const readTail = (filepath: string, maxBytes: number): string => {
	const stat = fs.statSync(filepath);
	if (stat.size <= maxBytes) {
		return fs.readFileSync(filepath, "utf8");
	}
	const fd = fs.openSync(filepath, "r");
	try {
		const buf = Buffer.alloc(maxBytes);
		fs.readSync(fd, buf, 0, maxBytes, stat.size - maxBytes);
		return buf.toString("utf8");
	} finally {
		fs.closeSync(fd);
	}
};

const readRecentLines = (filepath: string, count: number): string[] => {
	const content = readTail(filepath, MAX_TAIL_BYTES);
	const lines = content.split("\n").filter((l) => l.length > 0);
	return lines.slice(-count);
};

export interface LastObservationResult {
	readonly ok: true;
	readonly present: boolean;
	readonly lastSeenAt: string | null;
	readonly stale: boolean;
}

export interface ProbeFailure {
	readonly ok: false;
	readonly reason: string;
}

export const checkLastObservation = (
	root: string,
	now: Date,
	staleAfterDays: number,
): LastObservationResult | ProbeFailure => {
	try {
		const filepath = path.join(root, SESSIONS);
		if (!fs.existsSync(filepath)) {
			return { ok: true, present: false, lastSeenAt: null, stale: false };
		}
		const recent = readRecentLines(filepath, 5);
		if (recent.length === 0) {
			return { ok: true, present: false, lastSeenAt: null, stale: false };
		}
		// Walk from newest backwards; tolerate truncated last line.
		for (let i = recent.length - 1; i >= 0; i--) {
			try {
				const parsed = JSON.parse(recent[i]) as { ts?: string };
				if (typeof parsed.ts !== "string") continue;
				const lastTime = Date.parse(parsed.ts);
				if (Number.isNaN(lastTime)) continue;
				const ageDays = (now.getTime() - lastTime) / (1000 * 60 * 60 * 24);
				return {
					ok: true,
					present: true,
					lastSeenAt: parsed.ts,
					stale: ageDays > staleAfterDays,
				};
			} catch {}
		}
		return { ok: false, reason: "no parseable observation in last 5 entries" };
	} catch (err) {
		return { ok: false, reason: `checkLastObservation failed: ${(err as Error).message}` };
	}
};

export interface SentinelResult {
	readonly ok: true;
	readonly enabled: boolean;
	readonly sessionsFileExists: boolean;
	readonly mutatingCliEverRan: boolean;
	readonly shouldWarn: boolean;
}

export const checkFirstObservationSentinel = (root: string): SentinelResult | ProbeFailure => {
	try {
		const settingsPath = path.join(root, SETTINGS);
		let enabled = false;
		if (fs.existsSync(settingsPath)) {
			const content = fs.readFileSync(settingsPath, "utf8");
			const parsed = yaml.load(content) as { enabled?: boolean } | null | undefined;
			enabled = parsed?.enabled === true;
		}
		const sessionsFileExists = fs.existsSync(path.join(root, SESSIONS));
		const mutatingCliEverRan = fs.existsSync(path.join(root, MUTATING_SENTINEL));
		const shouldWarn = enabled && mutatingCliEverRan && !sessionsFileExists;
		return { ok: true, enabled, sessionsFileExists, mutatingCliEverRan, shouldWarn };
	} catch (err) {
		return {
			ok: false,
			reason: `checkFirstObservationSentinel failed: ${(err as Error).message}`,
		};
	}
};

export interface DeadLetterResult {
	readonly ok: true;
	readonly present: boolean;
	readonly entryCount: number;
	readonly entryCountTruncated: boolean;
	readonly bytes: number;
}

export const auditDeadLetter = (root: string): DeadLetterResult | ProbeFailure => {
	try {
		const filepath = path.join(root, DEAD_LETTER);
		if (!fs.existsSync(filepath)) {
			return { ok: true, present: false, entryCount: 0, entryCountTruncated: false, bytes: 0 };
		}
		const stat = fs.statSync(filepath);
		// Avoid loading huge dead-letter into memory; sample the tail only.
		const sample = readTail(filepath, MAX_TAIL_BYTES);
		// If file is larger than sample, entryCount is a lower bound — prefix with ~.
		const approxLines = sample.split("\n").filter((l) => l.length > 0).length;
		const truncated = stat.size > MAX_TAIL_BYTES;
		return {
			ok: true,
			present: true,
			entryCount: approxLines,
			entryCountTruncated: truncated,
			bytes: stat.size,
		};
	} catch (err) {
		return { ok: false, reason: `auditDeadLetter failed: ${(err as Error).message}` };
	}
};
