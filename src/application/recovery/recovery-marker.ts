// src/application/recovery/recovery-marker.ts

import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MARKER_FILE = ".recovery-marker";

export interface RecoveryMarker {
	timestamp: string;
	errorMessage: string;
	errorStack: string;
	nodeVersion: string;
	platform: string;
	arch: string;
}

const markerPath = (homeDir: string): string => join(homeDir, MARKER_FILE);

const toMarker = (err: unknown): RecoveryMarker => {
	const e = err instanceof Error ? err : new Error(String(err));
	return {
		timestamp: new Date().toISOString(),
		errorMessage: e.message,
		errorStack: e.stack ?? "",
		nodeVersion: process.version,
		platform: process.platform,
		arch: process.arch,
	};
};

export async function writeRecoveryMarker(homeDir: string, err: unknown): Promise<void> {
	const marker = toMarker(err);
	const target = markerPath(homeDir);
	const tmp = `${target}.${randomBytes(6).toString("hex")}.tmp`;
	await mkdir(homeDir, { recursive: true });
	await writeFile(tmp, JSON.stringify(marker), "utf-8");
	await rename(tmp, target);
}

export async function recoveryMarkerExists(homeDir: string): Promise<boolean> {
	try {
		await stat(markerPath(homeDir));
		return true;
	} catch {
		return false;
	}
}

export async function readRecoveryMarker(homeDir: string): Promise<RecoveryMarker | null> {
	try {
		const raw = await readFile(markerPath(homeDir), "utf-8");
		const parsed = JSON.parse(raw) as RecoveryMarker;
		if (
			typeof parsed.timestamp !== "string" ||
			typeof parsed.errorMessage !== "string" ||
			typeof parsed.errorStack !== "string" ||
			typeof parsed.nodeVersion !== "string" ||
			typeof parsed.platform !== "string" ||
			typeof parsed.arch !== "string"
		) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

export async function clearRecoveryMarker(homeDir: string): Promise<void> {
	try {
		await unlink(markerPath(homeDir));
	} catch (err) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code !== "ENOENT") throw err;
	}
}
