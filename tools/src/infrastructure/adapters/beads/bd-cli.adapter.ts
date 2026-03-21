import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type BeadStore, type BeadData } from '../../../domain/ports/bead-store.port.js';
import { type BeadLabel } from '../../../domain/value-objects/bead-label.js';
import { type Result, Ok, Err } from '../../../domain/result.js';
import { type DomainError, createDomainError } from '../../../domain/errors/domain-error.js';

const exec = promisify(execFile);
const bdError = (message: string, context?: Record<string, unknown>): DomainError => createDomainError('SYNC_CONFLICT', message, context);

const runBd = async (args: string[]): Promise<Result<string, DomainError>> => {
  try { const { stdout } = await exec('bd', args, { timeout: 10_000 }); return Ok(stdout.trim()); }
  catch (err) { return Err(bdError(`bd ${args.join(' ')} failed: ${err}`, { args })); }
};

const parseJsonOutput = <T>(output: string): Result<T, DomainError> => {
  try { return Ok(JSON.parse(output) as T); }
  catch { return Err(bdError('Failed to parse bd output as JSON', { output })); }
};

export class BdCliAdapter implements BeadStore {
  async create(input: { label: BeadLabel; title: string; design?: string; parentId?: string; }): Promise<Result<BeadData, DomainError>> {
    const args = ['create', '--label', input.label, '--title', input.title, '--json'];
    if (input.design) args.push('--design', input.design);
    if (input.parentId) args.push('--parent', input.parentId);
    const result = await runBd(args);
    if (!result.ok) return result;
    return parseJsonOutput<BeadData>(result.data);
  }

  async get(id: string): Promise<Result<BeadData, DomainError>> {
    const result = await runBd(['show', id, '--json']);
    if (!result.ok) return result;
    return parseJsonOutput<BeadData>(result.data);
  }

  async list(filter: { label?: BeadLabel; parentId?: string; status?: string; }): Promise<Result<BeadData[], DomainError>> {
    const args = ['list', '--json'];
    if (filter.label) args.push('--label', filter.label);
    if (filter.parentId) args.push('--parent', filter.parentId);
    if (filter.status) args.push('--status', filter.status);
    const result = await runBd(args);
    if (!result.ok) return result;
    return parseJsonOutput<BeadData[]>(result.data);
  }

  async updateStatus(id: string, status: string): Promise<Result<void, DomainError>> { const r = await runBd(['update', id, '--status', status]); if (!r.ok) return r; return Ok(undefined); }
  async updateDesign(id: string, design: string): Promise<Result<void, DomainError>> { const r = await runBd(['update', id, '--design', design]); if (!r.ok) return r; return Ok(undefined); }
  async updateMetadata(id: string, key: string, value: string): Promise<Result<void, DomainError>> { const r = await runBd(['kv', 'set', `${id}.${key}`, value]); if (!r.ok) return r; return Ok(undefined); }
  async addDependency(fromId: string, toId: string, type: 'blocks' | 'validates'): Promise<Result<void, DomainError>> { const r = await runBd(['link', fromId, toId, '--type', type]); if (!r.ok) return r; return Ok(undefined); }
  async close(id: string): Promise<Result<void, DomainError>> { const r = await runBd(['close', id]); if (!r.ok) return r; return Ok(undefined); }
}
