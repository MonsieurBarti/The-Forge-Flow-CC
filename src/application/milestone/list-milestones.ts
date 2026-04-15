import type { Milestone } from "../../domain/entities/milestone.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import type { Result } from "../../domain/result.js";

interface ListMilestonesDeps {
	milestoneStore: MilestoneStore;
}

export const listMilestones = async (
	deps: ListMilestonesDeps,
): Promise<Result<Milestone[], DomainError>> => {
	return deps.milestoneStore.listMilestones();
};
