import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createDomainError, type DomainError } from '../../../domain/errors/domain-error.js';
import type { BeadData, BeadStore } from '../../../domain/ports/bead-store.port.js';
import { Err, isOk, Ok, type Result } from '../../../domain/result.js';
import type { BeadLabel } from '../../../domain/value-objects/bead-label.js';

export class MarkdownBeadAdapter implements BeadStore {
  private readonly beadsDir: string;

  constructor(readonly basePath: string) {
    this.beadsDir = join(basePath, '.tff', 'beads');
  }

  async init(): Promise<Result<void, DomainError>> {
    await mkdir(this.beadsDir, { recursive: true });
    return Ok(undefined);
  }

  async registerStatuses(_statuses: string[]): Promise<Result<void, DomainError>> {
    // Markdown adapter accepts any status string — no registration needed
    return Ok(undefined);
  }

  async create(input: {
    label: BeadLabel;
    title: string;
    design?: string;
    description?: string;
    parentId?: string;
  }): Promise<Result<BeadData, DomainError>> {
    const id = randomUUID().slice(0, 8);
    const bead: BeadData = {
      id,
      label: input.label,
      title: input.title,
      status: 'open',
      design: input.design,
      parentId: input.parentId,
    };
    await writeFile(this.filePath(id), JSON.stringify(bead, null, 2));
    return Ok(bead);
  }

  async get(id: string): Promise<Result<BeadData, DomainError>> {
    try {
      const raw = await readFile(this.filePath(id), 'utf-8');
      return Ok(JSON.parse(raw) as BeadData);
    } catch {
      return Err(createDomainError('NOT_FOUND', `Bead "${id}" not found`, { id }));
    }
  }

  async list(filter: {
    label?: BeadLabel;
    parentId?: string;
    status?: string;
    includeAll?: boolean;
  }): Promise<Result<BeadData[], DomainError>> {
    const allResult = await this.readAll();
    if (!isOk(allResult)) return allResult;

    let results = allResult.data;
    if (filter.label) results = results.filter((b) => b.label === filter.label);
    if (filter.parentId) results = results.filter((b) => b.parentId === filter.parentId);
    if (filter.status) results = results.filter((b) => b.status === filter.status);
    return Ok(results);
  }

  async ready(): Promise<Result<BeadData[], DomainError>> {
    const allResult = await this.readAll();
    if (!isOk(allResult)) return allResult;
    return Ok(allResult.data.filter((b) => b.status === 'open'));
  }

  async updateStatus(id: string, status: string): Promise<Result<void, DomainError>> {
    const result = await this.get(id);
    if (!isOk(result)) return result;
    result.data.status = status;
    await this.writeBead(result.data);
    return Ok(undefined);
  }

  async claim(id: string): Promise<Result<void, DomainError>> {
    const result = await this.get(id);
    if (!isOk(result)) return result;
    result.data.status = 'in_progress';
    result.data.claimedAt = new Date().toISOString();
    await this.writeBead(result.data);
    return Ok(undefined);
  }

  async listStaleClaims(ttlMinutes: number): Promise<Result<BeadData[], DomainError>> {
    const allResult = await this.readAll();
    if (!isOk(allResult)) return allResult;
    const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000).toISOString();
    const stale = allResult.data.filter(
      (b) => b.status === 'in_progress' && b.claimedAt != null && b.claimedAt < cutoff,
    );
    return Ok(stale);
  }

  async updateDesign(id: string, design: string): Promise<Result<void, DomainError>> {
    const result = await this.get(id);
    if (!isOk(result)) return result;
    result.data.design = design;
    await this.writeBead(result.data);
    return Ok(undefined);
  }

  async updateMetadata(id: string, key: string, value: string): Promise<Result<void, DomainError>> {
    const result = await this.get(id);
    if (!isOk(result)) return result;
    result.data.metadata = { ...result.data.metadata, [key]: value };
    await this.writeBead(result.data);
    return Ok(undefined);
  }

  async addDependency(fromId: string, toId: string, type: 'blocks' | 'validates'): Promise<Result<void, DomainError>> {
    const result = await this.get(fromId);
    if (!isOk(result)) return result;
    const bead = result.data;
    if (type === 'blocks') {
      bead.blocks = [...(bead.blocks ?? []), toId];
    } else {
      bead.validates = [...(bead.validates ?? []), toId];
    }
    await this.writeBead(bead);
    return Ok(undefined);
  }

  async close(id: string, _reason?: string): Promise<Result<void, DomainError>> {
    return this.updateStatus(id, 'closed');
  }

  private filePath(id: string): string {
    return join(this.beadsDir, `${id}.json`);
  }

  private async writeBead(bead: BeadData): Promise<void> {
    await writeFile(this.filePath(bead.id), JSON.stringify(bead, null, 2));
  }

  private async readAll(): Promise<Result<BeadData[], DomainError>> {
    try {
      const files = await readdir(this.beadsDir);
      const beads: BeadData[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const raw = await readFile(join(this.beadsDir, file), 'utf-8');
        beads.push(JSON.parse(raw) as BeadData);
      }
      return Ok(beads);
    } catch {
      return Ok([]);
    }
  }
}
