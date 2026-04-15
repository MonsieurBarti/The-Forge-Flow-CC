import type { DomainError } from "../../../domain/errors/domain-error.js";
import type { StateExporter } from "../../../domain/ports/state-exporter.port.js";
import type { Result } from "../../../domain/result.js";
import type { StateSnapshot } from "../../../domain/value-objects/state-snapshot.js";
import type { SQLiteStateAdapter } from "../sqlite/sqlite-state.adapter.js";
/**
 * Exports complete state from SQLite to a portable JSON snapshot.
 * Uses the public methods of SQLiteStateAdapter to ensure consistency.
 */
export declare class SQLiteStateExporter implements StateExporter {
    private readonly adapter;
    constructor(adapter: SQLiteStateAdapter);
    export(): Result<StateSnapshot, DomainError>;
}
//# sourceMappingURL=sqlite-state-exporter.d.ts.map