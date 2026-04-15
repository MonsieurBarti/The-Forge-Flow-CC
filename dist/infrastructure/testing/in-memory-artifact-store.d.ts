import { type DomainError } from "../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import { type Result } from "../../domain/result.js";
export declare class InMemoryArtifactStore implements ArtifactStore {
    private files;
    private failOnWritePaths;
    simulateWriteFailure(path: string): void;
    read(path: string): Promise<Result<string, DomainError>>;
    write(path: string, content: string): Promise<Result<void, DomainError>>;
    exists(path: string): Promise<boolean>;
    list(directory: string): Promise<Result<string[], DomainError>>;
    mkdir(_path: string): Promise<Result<void, DomainError>>;
    reset(): void;
    seed(files: Record<string, string>): void;
    getAll(): Map<string, string>;
}
//# sourceMappingURL=in-memory-artifact-store.d.ts.map