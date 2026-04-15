import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createDomainError, type DomainError } from "../../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../../domain/ports/artifact-store.port.js";
import { Err, Ok, type Result } from "../../../domain/result.js";

export class MarkdownArtifactAdapter implements ArtifactStore {
	constructor(private readonly basePath: string) {}
	private resolve(path: string): string {
		const resolved = resolve(join(this.basePath, path));
		const base = resolve(this.basePath);
		if (!resolved.startsWith(`${base}/`) && resolved !== base) {
			throw new Error(`Path traversal rejected: ${path}`);
		}
		return resolved;
	}

	async read(path: string): Promise<Result<string, DomainError>> {
		try {
			return Ok(await readFile(this.resolve(path), "utf-8"));
		} catch {
			return Err(createDomainError("NOT_FOUND", `File not found: ${path}`, { path }));
		}
	}

	async write(path: string, content: string): Promise<Result<void, DomainError>> {
		try {
			const fullPath = this.resolve(path);
			await mkdir(dirname(fullPath), { recursive: true });
			await writeFile(fullPath, content, "utf-8");
			return Ok(undefined);
		} catch (err) {
			return Err(
				createDomainError("VALIDATION_ERROR", `Failed to write: ${path}`, {
					path,
					error: String(err),
				}),
			);
		}
	}

	async exists(path: string): Promise<boolean> {
		try {
			await access(this.resolve(path));
			return true;
		} catch {
			return false;
		}
	}

	async list(directory: string): Promise<Result<string[], DomainError>> {
		try {
			const entries = await readdir(this.resolve(directory));
			return Ok(entries.map((e) => join(directory, e)));
		} catch {
			return Ok([]);
		}
	}

	async mkdir(path: string): Promise<Result<void, DomainError>> {
		try {
			await mkdir(this.resolve(path), { recursive: true });
			return Ok(undefined);
		} catch (err) {
			return Err(
				createDomainError("VALIDATION_ERROR", `Failed to mkdir: ${path}`, {
					path,
					error: String(err),
				}),
			);
		}
	}
}
