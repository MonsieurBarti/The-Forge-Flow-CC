import { createDomainError, type DomainError } from '../../domain/errors/domain-error.js';
import type { BeadData, BeadStore } from '../../domain/ports/bead-store.port.js';
import { Err, Ok, type Result } from '../../domain/result.js';
import type { BeadLabel } from '../../domain/value-objects/bead-label.js';

export class InMemoryBeadStore implements BeadStore {
  private beads = new Map<string, BeadData>();
  private nextId = 1;
  private failOnUpdateIds = new Set<string>();

  simulateUpdateFailure(id: string): void {
    this.failOnUpdateIds.add(id);
  }

  async init(): Promise<Result<void, DomainError>> {
    return Ok(undefined);
  }

  async registerStatuses(_statuses: string[]): Promise<Result<void, DomainError>> {
    return Ok(undefined);
  }

  async create(input: {
    label: BeadLabel;
    title: string;
    design?: string;
    description?: string;
    parentId?: string;
  }): Promise<Result<BeadData, DomainError>> {
    const id = `bead-${this.nextId++}`;
    const bead: BeadData = {
      id,
      label: input.label,
      title: input.title,
      status: 'open',
      design: input.design,
      parentId: input.parentId,
    };
    this.beads.set(id, bead);
    return Ok(bead);
  }

  async get(id: string): Promise<Result<BeadData, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('NOT_FOUND', `Bead "${id}" not found`, { id }));
    return Ok(bead);
  }

  async list(filter: {
    label?: BeadLabel;
    parentId?: string;
    status?: string;
    includeAll?: boolean;
  }): Promise<Result<BeadData[], DomainError>> {
    let results = [...this.beads.values()];
    if (filter.label) results = results.filter((b) => b.label === filter.label);
    if (filter.parentId) results = results.filter((b) => b.parentId === filter.parentId);
    if (filter.status) results = results.filter((b) => b.status === filter.status);
    return Ok(results);
  }

  async ready(): Promise<Result<BeadData[], DomainError>> {
    // Return open beads with no unresolved blockers
    const results = [...this.beads.values()].filter((b) => {
      if (b.status !== 'open') return false;
      if (!b.blocks || b.blocks.length === 0) return true;
      return b.blocks.every((blockerId) => this.beads.get(blockerId)?.status === 'closed');
    });
    return Ok(results);
  }

  async updateStatus(id: string, status: string): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('NOT_FOUND', `Bead "${id}" not found`, { id }));
    bead.status = status;
    return Ok(undefined);
  }

  async claim(id: string): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('NOT_FOUND', `Bead "${id}" not found`, { id }));
    bead.status = 'in_progress';
    bead.claimedAt = new Date().toISOString();
    return Ok(undefined);
  }

  async listStaleClaims(ttlMinutes: number): Promise<Result<BeadData[], DomainError>> {
    const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000).toISOString();
    const stale = [...this.beads.values()].filter(
      (b) => b.status === 'in_progress' && b.claimedAt != null && b.claimedAt < cutoff,
    );
    return Ok(stale);
  }

  async updateDesign(id: string, design: string): Promise<Result<void, DomainError>> {
    if (this.failOnUpdateIds.has(id)) {
      return Err(createDomainError('WRITE_FAILURE', `Simulated update failure for bead: ${id}`, { id }));
    }
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('NOT_FOUND', `Bead "${id}" not found`, { id }));
    bead.design = design;
    return Ok(undefined);
  }

  async updateMetadata(id: string, key: string, value: string): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('NOT_FOUND', `Bead "${id}" not found`, { id }));
    bead.metadata = { ...bead.metadata, [key]: value };
    return Ok(undefined);
  }

  async addDependency(fromId: string, toId: string, type: 'blocks' | 'validates'): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(fromId);
    if (!bead) return Err(createDomainError('NOT_FOUND', `Bead "${fromId}" not found`, { id: fromId }));
    if (type === 'blocks') {
      bead.blocks = [...(bead.blocks ?? []), toId];
    } else {
      bead.validates = [...(bead.validates ?? []), toId];
    }
    return Ok(undefined);
  }

  async close(id: string, _reason?: string): Promise<Result<void, DomainError>> {
    return this.updateStatus(id, 'closed');
  }

  // Test helpers
  reset(): void {
    this.beads.clear();
    this.nextId = 1;
  }
  seed(beads: BeadData[]): void {
    for (const bead of beads) {
      this.beads.set(bead.id, bead);
    }
  }
}
