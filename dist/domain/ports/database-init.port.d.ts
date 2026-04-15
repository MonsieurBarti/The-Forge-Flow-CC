import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
export interface DatabaseInit {
    init(): Result<void, DomainError>;
}
//# sourceMappingURL=database-init.port.d.ts.map