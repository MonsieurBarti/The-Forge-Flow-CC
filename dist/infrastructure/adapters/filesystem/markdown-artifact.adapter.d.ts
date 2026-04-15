import { type DomainError } from "../../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../../domain/ports/artifact-store.port.js";
import { type Result } from "../../../domain/result.js";
export declare class MarkdownArtifactAdapter implements ArtifactStore {
    private readonly basePath;
    constructor(basePath: string);
    private resolve;
    read(path: string): Promise<Result<string, DomainError>>;
    write(path: string, content: string): Promise<Result<void, DomainError>>;
    exists(path: string): Promise<boolean>;
    list(directory: string): Promise<Result<string[], DomainError>>;
    mkdir(path: string): Promise<Result<void, DomainError>>;
}
//# sourceMappingURL=markdown-artifact.adapter.d.ts.map