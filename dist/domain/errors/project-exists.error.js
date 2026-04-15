import { createDomainError } from "./domain-error.js";
export const projectExistsError = (projectName) => createDomainError("PROJECT_EXISTS", `Project "${projectName}" already exists in this repository`, { projectName });
//# sourceMappingURL=project-exists.error.js.map