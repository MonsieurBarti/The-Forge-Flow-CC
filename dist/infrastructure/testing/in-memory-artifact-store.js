import { createDomainError } from "../../domain/errors/domain-error.js";
import { Err, Ok } from "../../domain/result.js";
export class InMemoryArtifactStore {
    files = new Map();
    failOnWritePaths = new Set();
    simulateWriteFailure(path) {
        this.failOnWritePaths.add(path);
    }
    async read(path) {
        const content = this.files.get(path);
        if (content === undefined)
            return Err(createDomainError("NOT_FOUND", `File not found: ${path}`, { path }));
        return Ok(content);
    }
    async write(path, content) {
        if (this.failOnWritePaths.has(path)) {
            return Err(createDomainError("WRITE_FAILURE", `Simulated write failure for: ${path}`, { path }));
        }
        this.files.set(path, content);
        return Ok(undefined);
    }
    async exists(path) {
        return this.files.has(path);
    }
    async list(directory) {
        const prefix = directory.endsWith("/") ? directory : `${directory}/`;
        const matches = [...this.files.keys()].filter((k) => k.startsWith(prefix));
        return Ok(matches);
    }
    async mkdir(_path) {
        return Ok(undefined);
    }
    reset() {
        this.files.clear();
    }
    seed(files) {
        for (const [path, content] of Object.entries(files)) {
            this.files.set(path, content);
        }
    }
    getAll() {
        return new Map(this.files);
    }
}
//# sourceMappingURL=in-memory-artifact-store.js.map