import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createDomainError } from "../../../domain/errors/domain-error.js";
import { Err, Ok } from "../../../domain/result.js";
export class MarkdownArtifactAdapter {
    basePath;
    constructor(basePath) {
        this.basePath = basePath;
    }
    resolve(path) {
        const resolved = resolve(join(this.basePath, path));
        const base = resolve(this.basePath);
        if (!resolved.startsWith(`${base}/`) && resolved !== base) {
            throw new Error(`Path traversal rejected: ${path}`);
        }
        return resolved;
    }
    async read(path) {
        try {
            return Ok(await readFile(this.resolve(path), "utf-8"));
        }
        catch {
            return Err(createDomainError("NOT_FOUND", `File not found: ${path}`, { path }));
        }
    }
    async write(path, content) {
        try {
            const fullPath = this.resolve(path);
            await mkdir(dirname(fullPath), { recursive: true });
            await writeFile(fullPath, content, "utf-8");
            return Ok(undefined);
        }
        catch (err) {
            return Err(createDomainError("VALIDATION_ERROR", `Failed to write: ${path}`, {
                path,
                error: String(err),
            }));
        }
    }
    async exists(path) {
        try {
            await access(this.resolve(path));
            return true;
        }
        catch {
            return false;
        }
    }
    async list(directory) {
        try {
            const entries = await readdir(this.resolve(directory));
            return Ok(entries.map((e) => join(directory, e)));
        }
        catch {
            return Ok([]);
        }
    }
    async mkdir(path) {
        try {
            await mkdir(this.resolve(path), { recursive: true });
            return Ok(undefined);
        }
        catch (err) {
            return Err(createDomainError("VALIDATION_ERROR", `Failed to mkdir: ${path}`, {
                path,
                error: String(err),
            }));
        }
    }
}
//# sourceMappingURL=markdown-artifact.adapter.js.map