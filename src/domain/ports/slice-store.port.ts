import type { Slice, SliceKind } from "../entities/slice.js";
import type { DomainError } from "../errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import type { Result } from "../result.js";
import type { SliceProps } from "../value-objects/slice-props.js";
import type { SliceStatus } from "../value-objects/slice-status.js";
import type { SliceUpdateProps } from "../value-objects/slice-update-props.js";

export interface ListSlicesOptions {
	milestoneId?: string;
	includeArchived?: boolean;
}

export interface ListSlicesByKindOptions {
	includeArchived?: boolean;
}

export interface SliceStore {
	createSlice(props: SliceProps): Result<Slice, DomainError>;
	getSlice(id: string): Result<Slice | null, DomainError>;
	getSliceByNumbers(
		milestoneNumber: number,
		sliceNumber: number,
	): Result<Slice | null, DomainError>;
	listSlices(milestoneIdOrOptions?: string | ListSlicesOptions): Result<Slice[], DomainError>;
	listSlicesByKind(
		kind: SliceKind,
		options?: ListSlicesByKindOptions,
	): Result<Slice[], DomainError>;
	updateSlice(id: string, updates: SliceUpdateProps): Result<void, DomainError>;
	transitionSlice(id: string, target: SliceStatus): Result<DomainEvent[], DomainError>;
	/**
	 * Mark a slice as archived. Sets `archived_at = datetime('now')`.
	 * Idempotent — no-op if already archived. The DB row is preserved
	 * because routing telemetry references it.
	 */
	archiveSlice(id: string): Result<void, DomainError>;
}
