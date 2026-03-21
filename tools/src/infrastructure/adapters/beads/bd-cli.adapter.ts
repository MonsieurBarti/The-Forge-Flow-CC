import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type BeadStore, type BeadData } from '../../../domain/ports/bead-store.port.js';
import { type BeadLabel } from '../../../domain/value-objects/bead-label.js';
import { type Result, Ok, Err } from '../../../domain/result.js';
import { type DomainError, createDomainError } from '../../../domain/errors/domain-error.js';

const exec = promisify(execFile);
const bdError = (message: string, context?: Record<string, unknown>): DomainError =>
  createDomainError('SYNC_CONFLICT', message, context);

const runBd = async (
  args: string[],
  stdin?: string,
): Promise<Result<string, DomainError>> => {
  try {
    const options: { timeout: number; input?: string } = { timeout: 30_000 };
    if (stdin) options.input = stdin;
    const proc = exec('bd', args, options);
    const { stdout } = await proc;
    return Ok(stdout.trim());
  } catch (err) {
    return Err(bdError(`bd ${args.join(' ')} failed: ${err}`, { args }));
  }
};

/**
 * Normalize beads JSON output (snake_case) to our BeadData interface.
 * bd returns snake_case fields: issue_type, created_at, parent_id, etc.
 */
const normalizeBeadData = (raw: Record<string, unknown>): BeadData => {
  const labels = Array.isArray(raw.labels) ? raw.labels as string[] : [];
  // Find the tff: label (the one that matters for our type system)
  const tffLabel = labels.find((l) => l.startsWith('tff:')) ?? (raw.issue_type as string ?? 'task');
  return {
  id: raw.id as string,
  label: tffLabel,
  title: raw.title as string,
  status: raw.status as string,
  design: raw.design as string | undefined,
  parentId: (raw.parent_id ?? raw.parentId) as string | undefined,
  blocks: raw.blocks as string[] | undefined,
  validates: raw.validates as string[] | undefined,
  metadata: raw.metadata as Record<string, string> | undefined,
};
};

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
    description?: string;
    parentId?: string;
  }): Promise<Result<BeadData, DomainError>> {
    const args = ['create', input.title, '-l', input.label, '--no-inherit-labels', '--json'];
    if (input.parentId) args.push('--parent', input.parentId);

    // Use --stdin for design/description to avoid shell escaping issues
    // with backticks, quotes, and special characters
    if (input.design) args.push('--design', input.design);
    if (input.description) {
      // Pipe description via stdin to handle special chars safely
      args.push('--stdin');
      const result = await runBd(args, input.description);
      if (!result.ok) return result;
      const parsed = parseJsonOutput<Record<string, unknown>>(result.data);
      if (!parsed.ok) return parsed;
      return Ok(normalizeBeadData(parsed.data));
    }

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

  async ready(): Promise<Result<BeadData[], DomainError>> {
    const result = await runBd(['ready', '--json']);
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

  async claim(id: string): Promise<Result<void, DomainError>> {
    // Atomically sets assignee + status to in_progress
    const r = await runBd(['update', id, '--claim']);
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

  async close(id: string, reason?: string): Promise<Result<void, DomainError>> {
    const args = ['close', id];
    if (reason) args.push('--reason', reason);
    const r = await runBd(args);
    if (!r.ok) return r;
    return Ok(undefined);
  }
}
