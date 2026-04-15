import { createDomainError } from "./domain-error.js";
export const hasOpenChildrenError = (parentId, openCount) => createDomainError("HAS_OPEN_CHILDREN", `Cannot close "${parentId}" — ${openCount} children are still open`, {
    parentId,
    openCount,
});
//# sourceMappingURL=has-open-children.error.js.map