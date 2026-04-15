import type { DomainError } from "../../../domain/errors/domain-error.js";
import type { StateImporter } from "../../../domain/ports/state-exporter.port.js";
import type { Result } from "../../../domain/result.js";
import type { StateSnapshot } from "../../../domain/value-objects/state-snapshot.js";
import type { SQLiteStateAdapter } from "../sqlite/sqlite-state.adapter.js";
/**
 * Imports complete state from portable JSON snapshot into SQLite.
 * Replaces existing state (destructive operation).
 */
export declare class SQLiteStateImporter implements StateImporter {
    private readonly adapter;
    constructor(adapter: SQLiteStateAdapter);
    import(snapshot: StateSnapshot): Result<void, DomainError>;
    private clearTable;
}
//# sourceMappingURL=sqlite-state-importer.d.ts.map