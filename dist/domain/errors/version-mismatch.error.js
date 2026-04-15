import { createDomainError } from "./domain-error.js";
export const versionMismatchError = (dbVersion, codeVersion) => createDomainError("VERSION_MISMATCH", `Database schema version ${dbVersion} is newer than code version ${codeVersion}. Upgrade tff-tools.`, { dbVersion, codeVersion });
//# sourceMappingURL=version-mismatch.error.js.map