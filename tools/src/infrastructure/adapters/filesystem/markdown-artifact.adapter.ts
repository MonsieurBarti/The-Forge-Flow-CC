import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { type ArtifactStore } from '../../../domain/ports/artifact-store.port.js';
import { type Result, Ok, Err } from '../../../domain/result.js';
import { type DomainError, createDomainError } from '../../../domain/errors/domain-error.js';

export class MarkdownArtifactAdapter implements ArtifactStore {
  constructor(private readonly basePath: string) {}
  private resolve(path: string): string { return join(this.basePath, path); }

  async read(path: string): Promise<Result<string, DomainError>> {
    try { return Ok(await readFile(this.resolve(path), 'utf-8')); }
    catch { return Err(createDomainError('PROJECT_EXISTS', `File not found: ${path}`, { path })); }
  }

  async write(path: string, content: string): Promise<Result<void, DomainError>> {
    try { const fullPath = this.resolve(path); await mkdir(dirname(fullPath), { recursive: true }); await writeFile(fullPath, content, 'utf-8'); return Ok(undefined); }
    catch (err) { return Err(createDomainError('SYNC_CONFLICT', `Failed to write: ${path}`, { path, error: String(err) })); }
  }

  async exists(path: string): Promise<boolean> {
    try { await access(this.resolve(path)); return true; } catch { return false; }
  }

  async list(directory: string): Promise<Result<string[], DomainError>> {
    try { const entries = await readdir(this.resolve(directory)); return Ok(entries.map((e) => join(directory, e))); }
    catch { return Ok([]); }
  }

  async mkdir(path: string): Promise<Result<void, DomainError>> {
    try { await mkdir(this.resolve(path), { recursive: true }); return Ok(undefined); }
    catch (err) { return Err(createDomainError('SYNC_CONFLICT', `Failed to mkdir: ${path}`, { path, error: String(err) })); }
  }
}
