/**
 * Thin wrappers around the canonical edge table in
 * `../value-objects/slice-status.ts`. `validate` delegates to
 * {@link canTransition}; `SLICE_EDGES` is derived from
 * {@link validTransitionsFrom}; `isTerminal` and `getValidNext` are convenience
 * helpers over the same primitives. Never encode new transitions here — add
 * them to the `transitions` record in `slice-status.ts`.
 */
import {
	canTransition,
	type SliceStatus,
	SliceStatusSchema,
	validTransitionsFrom,
} from "../value-objects/slice-status.js";

export type SliceEdge = readonly [SliceStatus, SliceStatus];

export const SLICE_EDGES: readonly SliceEdge[] = SliceStatusSchema.options.flatMap((from) =>
	validTransitionsFrom(from).map((to) => [from, to] as const),
);

export interface LegalTransition {
	ok: true;
}
export interface IllegalTransition {
	ok: false;
	violation: {
		code: "ILLEGAL_TRANSITION";
		from: SliceStatus;
		expected: readonly SliceStatus[];
		actual: SliceStatus;
	};
}

export const validate = (
	from: SliceStatus,
	to: SliceStatus,
): LegalTransition | IllegalTransition => {
	if (canTransition(from, to)) return { ok: true };
	return {
		ok: false,
		violation: {
			code: "ILLEGAL_TRANSITION",
			from,
			expected: validTransitionsFrom(from),
			actual: to,
		},
	};
};

export const isTerminal = (status: SliceStatus): boolean =>
	validTransitionsFrom(status).length === 0;

export const getValidNext = (status: SliceStatus): readonly SliceStatus[] =>
	validTransitionsFrom(status);
