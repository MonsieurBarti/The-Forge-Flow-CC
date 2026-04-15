import type { Slice } from "../entities/slice.js";
import type { DomainError } from "../errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import type { Result } from "../result.js";
import type { SliceProps } from "../value-objects/slice-props.js";
import type { SliceStatus } from "../value-objects/slice-status.js";
import type { SliceUpdateProps } from "../value-objects/slice-update-props.js";
export interface SliceStore {
    createSlice(props: SliceProps): Result<Slice, DomainError>;
    getSlice(id: string): Result<Slice | null, DomainError>;
    listSlices(milestoneId?: string): Result<Slice[], DomainError>;
    updateSlice(id: string, updates: SliceUpdateProps): Result<void, DomainError>;
    transitionSlice(id: string, target: SliceStatus): Result<DomainEvent[], DomainError>;
}
//# sourceMappingURL=slice-store.port.d.ts.map