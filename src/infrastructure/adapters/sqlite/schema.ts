import type Database from "better-sqlite3";
import { v1Migration } from "./migrations/v1.js";
import { v2Migration } from "./migrations/v2.js";
import { v3Migration } from "./migrations/v3.js";
import { v4Migration } from "./migrations/v4.js";

const migrations: Array<{ version: number; sql: string }> = [
	{ version: 1, sql: v1Migration },
	{ version: 2, sql: v2Migration },
	{ version: 3, sql: v3Migration },
	{ version: 4, sql: v4Migration },
];

export const getCurrentVersion = (db: Database.Database): number => {
	try {
		const row = db.prepare("SELECT MAX(version) as version FROM schema_version").get() as
			| { version: number | null }
			| undefined;
		return row?.version ?? 0;
	} catch {
		return 0;
	}
};

export const runMigrations = (db: Database.Database): void => {
	// Enable WAL mode and foreign keys (must be outside transaction)
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");

	const currentVersion = getCurrentVersion(db);

	// Version check: if DB is ahead of code, throw
	const maxCodeVersion = migrations[migrations.length - 1]?.version ?? 0;
	if (currentVersion > maxCodeVersion) {
		throw new Error(
			`VERSION_MISMATCH: Database schema version ${currentVersion} is newer than code version ${maxCodeVersion}. Upgrade tff-tools.`,
		);
	}

	// Run pending migrations in a transaction
	for (const migration of migrations) {
		if (migration.version <= currentVersion) continue;

		db.transaction(() => {
			db.exec(migration.sql);
			db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(migration.version);
		})();
	}
};
