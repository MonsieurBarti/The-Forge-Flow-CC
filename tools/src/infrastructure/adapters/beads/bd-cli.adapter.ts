import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type BeadStore, type BeadData } from '../../../domain/ports/bead-store.port.js';
import { type BeadLabel } from '../../../domain/value-objects/bead-label.js';
import { type Result, Ok, Err } from '../../../domain/result.js';
import { type DomainError, createDomainError } from '../../../domain/errors/domain-error.js';

const exec = promisify(execFile);
const bdError = (message: string, context?: Record<string, unknown>): DomainError =>
  createDomainError('SYNC_CONFLICT', message, context);

const runBd = async (args: string[]): Promise<Result<string, DomainError>> => {
  try {
    const { stdout } = await exec('bd', args, { timeout: 30_000 });
    return Ok(stdout.trim());
  } catch (err) {
    return Err(bdError(`bd ${args.join(' ')} failed: ${err}`, { args }));
  }
};

/**
 * Normalize beads JSON output (snake_case) to our BeadData interface (camelCase).
 * bd returns snake_case fields: issue_type, created_at, parent_id, etc.
 */
const normalizeBeadData = (raw: Record<string, unknown>): BeadData => ({
  id: raw.id as string,
  label: Array.isArray(raw.labels) && raw.labels.length > 0
    ? (raw.labels as string[])[0]
    : (raw.issue_type as string ?? 'task'),
  title: raw.title as string,
  status: raw.status as string,
  design: raw.design as string | undefined,
  parentId: (raw.parent_id ?? raw.parentId) as string | undefined,
  blocks: raw.blocks as string[] | undefined,
  validates: raw.validates as string[] | undefined,
  metadata: raw.metadata as Record<string, string> | undefined,
});

const parseJsonOutput = <T>(output: string): Result<T, DomainError> => {
  try {
    return Ok(JSON.parse(output) as T);
  } catch {
    return Err(bdError('Failed to parse bd output as JSON', { output }));
  }
};

export class BdCliAdapter implements BeadStore {
  async init(): Promise<Result<void, DomainError>> {
    const r = await runBd(['init']);
    if (!r.ok) return r;
    return Ok(undefined);
  }

  async create(input: {
    label: BeadLabel;
    title: string;
    design?: string;
    parentId?: string;
  }): Promise<Result<BeadData, DomainError>> {
    const args = ['create', input.title, '-l', input.label, '--json'];
    if (input.design) args.push('--design', input.design);
    if (input.parentId) args.push('--parent', input.parentId);
    const result = await runBd(args);
    if (!result.ok) return result;
    const parsed = parseJsonOutput<Record<string, unknown>>(result.data);
    if (!parsed.ok) return parsed;
    return Ok(normalizeBeadData(parsed.data));
  }

  async get(id: string): Promise<Result<BeadData, DomainError>> {
    const result = await runBd(['show', id, '--json']);
    if (!result.ok) return result;
    // bd show returns an array even for a single ID
    const parsed = parseJsonOutput<Record<string, unknown>[]>(result.data);
    if (!parsed.ok) return parsed;
    if (parsed.data.length === 0) {
      return Err(bdError(`Bead "${id}" not found`, { id }));
    }
    return Ok(normalizeBeadData(parsed.data[0]));
  }

  async list(filter: {
    label?: BeadLabel;
    parentId?: string;
    status?: string;
  }): Promise<Result<BeadData[], DomainError>> {
    const args = ['list', '--json'];
    if (filter.label) args.push('-l', filter.label);
    if (filter.parentId) args.push('--parent', filter.parentId);
    if (filter.status) args.push('-s', filter.status);
    const result = await runBd(args);
    if (!result.ok) return result;
    const parsed = parseJsonOutput<Record<string, unknown>[]>(result.data);
    if (!parsed.ok) return parsed;
    return Ok(parsed.data.map(normalizeBeadData));
  }

  async updateStatus(id: string, status: string): Promise<Result<void, DomainError>> {
    const r = await runBd(['update', id, '-s', status]);
    if (!r.ok) return r;
    return Ok(undefined);
  }

  async updateDesign(id: string, design: string): Promise<Result<void, DomainError>> {
    const r = await runBd(['update', id, '--design', design]);
    if (!r.ok) return r;
    return Ok(undefined);
  }

  async updateMetadata(id: string, key: string, value: string): Promise<Result<void, DomainError>> {
    const r = await runBd(['kv', 'set', `${id}.${key}`, value]);
    if (!r.ok) return r;
    return Ok(undefined);
  }

  async addDependency(
    fromId: string,
    toId: string,
    type: 'blocks' | 'validates',
  ): Promise<Result<void, DomainError>> {
    const r = await runBd(['dep', 'add', fromId, toId, '-t', type]);
    if (!r.ok) return r;
    return Ok(undefined);
  }

  async close(id: string): Promise<Result<void, DomainError>> {
    const r = await runBd(['close', id]);
    if (!r.ok) return r;
    return Ok(undefined);
  }
}
