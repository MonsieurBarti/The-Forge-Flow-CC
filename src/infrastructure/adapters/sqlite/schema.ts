import type Database from "better-sqlite3";
import { v1Migration } from "./migrations/v1.js";
import { v2Migration } from "./migrations/v2.js";
import { v3Migration } from "./migrations/v3.js";
import { v4Migration } from "./migrations/v4.js";
import { v5Migration } from "./migrations/v5.js";
import { v6Migration } from "./migrations/v6.js";
import { v7Migration } from "./migrations/v7.js";
import { v8Migration } from "./migrations/v8.js";
import { v9Migration } from "./migrations/v9.js";

const migrations: Array<{ version: number; sql: string }> = [
	{ version: 1, sql: v1Migration },
	{ version: 2, sql: v2Migration },
	{ version: 3, sql: v3Migration },
	{ version: 4, sql: v4Migration },
	{ version: 5, sql: v5Migration },
	{ version: 6, sql: v6Migration },
	{ version: 7, sql: v7Migration },
	{ version: 8, sql: v8Migration },
	{ version: 9, sql: v9Migration },
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
	db.pragma("journal_mode = WAL");

	const currentVersion = getCurrentVersion(db);

	const maxCodeVersion = migrations[migrations.length - 1]?.version ?? 0;
	if (currentVersion > maxCodeVersion) {
		throw new Error(
			`VERSION_MISMATCH: Database schema version ${currentVersion} is newer than code version ${maxCodeVersion}. Upgrade tff-tools.`,
		);
	}

	// Per SQLite's "Making Other Kinds Of Table Schema Changes" recipe (§7),
	// table-rebuild migrations (CREATE _new + INSERT + DROP + RENAME) require
	// foreign_keys=OFF *before* the transaction; setting it inside is a no-op.
	// Without this, dependent rows (task, slice_dependency, …) trip the
	// deferred FK check at COMMIT and abort the migration. See issue #159.
	db.pragma("foreign_keys = OFF");
	try {
		for (const migration of migrations) {
			if (migration.version <= currentVersion) continue;

			db.transaction(() => {
				db.exec(migration.sql);
				db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(migration.version);
			})();
		}

		const violations = db.pragma("foreign_key_check") as unknown[];
		if (Array.isArray(violations) && violations.length > 0) {
			throw new Error(`Migration failed: foreign_key_check: ${JSON.stringify(violations)}`);
		}
	} finally {
		db.pragma("foreign_keys = ON");
	}
};
