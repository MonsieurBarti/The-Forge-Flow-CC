import { type BeadStore, type BeadData } from '../../domain/ports/bead-store.port.js';
import { type BeadLabel } from '../../domain/value-objects/bead-label.js';
import { type Result, Ok, Err } from '../../domain/result.js';
import { type DomainError, createDomainError } from '../../domain/errors/domain-error.js';

export class InMemoryBeadStore implements BeadStore {
  private beads = new Map<string, BeadData>();
  private nextId = 1;

  async create(input: { label: BeadLabel; title: string; design?: string; parentId?: string; }): Promise<Result<BeadData, DomainError>> {
    const id = `bead-${this.nextId++}`;
    const bead: BeadData = { id, label: input.label, title: input.title, status: 'open', design: input.design, parentId: input.parentId };
    this.beads.set(id, bead);
    return Ok(bead);
  }

  async get(id: string): Promise<Result<BeadData, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('PROJECT_EXISTS', `Bead "${id}" not found`, { id }));
    return Ok(bead);
  }

  async list(filter: { label?: BeadLabel; parentId?: string; status?: string; }): Promise<Result<BeadData[], DomainError>> {
    let results = [...this.beads.values()];
    if (filter.label) results = results.filter((b) => b.label === filter.label);
    if (filter.parentId) results = results.filter((b) => b.parentId === filter.parentId);
    if (filter.status) results = results.filter((b) => b.status === filter.status);
    return Ok(results);
  }

  async updateStatus(id: string, status: string): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('PROJECT_EXISTS', `Bead "${id}" not found`, { id }));
    bead.status = status;
    return Ok(undefined);
  }

  async updateDesign(id: string, design: string): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('PROJECT_EXISTS', `Bead "${id}" not found`, { id }));
    bead.design = design;
    return Ok(undefined);
  }

  async updateMetadata(id: string, key: string, value: string): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('PROJECT_EXISTS', `Bead "${id}" not found`, { id }));
    bead.metadata = { ...bead.metadata, [key]: value };
    return Ok(undefined);
  }

  async addDependency(fromId: string, toId: string, type: 'blocks' | 'validates'): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(fromId);
    if (!bead) return Err(createDomainError('PROJECT_EXISTS', `Bead "${fromId}" not found`, { id: fromId }));
    if (type === 'blocks') { bead.blocks = [...(bead.blocks ?? []), toId]; }
    else { bead.validates = [...(bead.validates ?? []), toId]; }
    return Ok(undefined);
  }

  async close(id: string): Promise<Result<void, DomainError>> { return this.updateStatus(id, 'closed'); }

  reset(): void { this.beads.clear(); this.nextId = 1; }
  seed(beads: BeadData[]): void { for (const bead of beads) { this.beads.set(bead.id, bead); } }
}
