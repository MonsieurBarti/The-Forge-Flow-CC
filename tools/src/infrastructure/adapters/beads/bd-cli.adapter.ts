import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type BeadStore, type BeadData } from '../../../domain/ports/bead-store.port.js';
import { type BeadLabel } from '../../../domain/value-objects/bead-label.js';
import { type Result, Ok, Err } from '../../../domain/result.js';
import { type DomainError, createDomainError } from '../../../domain/errors/domain-error.js';

const exec = promisify(execFile);
const bdError = (message: string, context?: Record<string, unknown>): DomainError =>
  createDomainError('SYNC_CONFLICT', message, context);

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseMs?: number; maxMs?: number } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseMs = opts.baseMs ?? 500;
  const maxMs = opts.maxMs ?? 4000;
  let lastError: Error;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxAttempts) {
        const delay = Math.min(baseMs * Math.pow(2, attempt - 1), maxMs);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError!;
}

/** Raw CLI call that throws on failure (used with withRetry). */
const execBd = async (
  args: string[],
  stdin?: string,
): Promise<string> => {
  const options: { timeout: number; input?: string } = { timeout: 30_000 };
  if (stdin) options.input = stdin;
  const { stdout } = await exec('bd', args, options);
  return stdout.trim();
};

const runBd = async (
  args: string[],
  stdin?: string,
): Promise<Result<string, DomainError>> => {
  try {
    const result = await execBd(args, stdin);
    return Ok(result);
  } catch (err) {
    return Err(bdError(`bd ${args.join(' ')} failed: ${err}`, { args }));
  }
};

/** runBd with exponential backoff retry for critical operations. */
const runBdRetry = async (
  args: string[],
  stdin?: string,
): Promise<Result<string, DomainError>> => {
  try {
    const result = await withRetry(() => execBd(args, stdin), { maxAttempts: 3 });
    return Ok(result);
  } catch (err) {
    return Err(bdError(`bd ${args.join(' ')} failed: ${err}`, { args }));
  }
};

/**
 * Normalize beads JSON output (snake_case) to our BeadData interface.
 * bd returns snake_case fields: issue_type, created_at, parent_id, etc.
 */
const normalizeBeadData = (raw: Record<string, unknown>): Result<BeadData, DomainError> => {
  if (!raw.id || typeof raw.id !== 'string') {
    return Err(createDomainError('VALIDATION_ERROR', "Malformed bead: missing 'id'"));
  }
  if (!raw.status || typeof raw.status !== 'string') {
    return Err(createDomainError('VALIDATION_ERROR', `Malformed bead: missing 'status' for ${raw.id}`));
  }
  const labels = Array.isArray(raw.labels) ? raw.labels as string[] : [];
  // Find the tff: label (the one that matters for our type system)
  const tffLabel = labels.find((l) => l.startsWith('tff:')) ?? (raw.issue_type as string ?? 'task');
  return Ok({
    id: raw.id,
    label: tffLabel,
    title: raw.title as string,
    status: raw.status,
    design: raw.design as string | undefined,
    parentId: (raw.parent_id ?? raw.parentId) as string | undefined,
    blocks: raw.blocks as string[] | undefined,
    validates: raw.validates as string[] | undefined,
    metadata: raw.metadata as Record<string, string> | undefined,
  });
};

/** Map an array of raw records through normalizeBeadData, short-circuiting on first error. */
const collectBeads = (items: Record<string, unknown>[]): Result<BeadData[], DomainError> => {
  const beads: BeadData[] = [];
  for (const item of items) {
    const r = normalizeBeadData(item);
    if (!r.ok) return r;
    beads.push(r.data);
  }
  return Ok(beads);
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
    // init is idempotent — ignore errors if already initialized
    await runBd(['init', '--quiet']);
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
      const result = await runBdRetry(args, input.description);
      if (!result.ok) return result;
      const parsed = parseJsonOutput<Record<string, unknown>>(result.data);
      if (!parsed.ok) return parsed;
      return normalizeBeadData(parsed.data);
    }

    const result = await runBdRetry(args);
    if (!result.ok) return result;
    const parsed = parseJsonOutput<Record<string, unknown>>(result.data);
    if (!parsed.ok) return parsed;
    return normalizeBeadData(parsed.data);
  }

  async get(id: string): Promise<Result<BeadData, DomainError>> {
    const result = await runBdRetry(['show', id, '--json']);
    if (!result.ok) return result;
    // bd show returns an array even for a single ID
    const parsed = parseJsonOutput<Record<string, unknown>[]>(result.data);
    if (!parsed.ok) return parsed;
    if (parsed.data.length === 0) {
      return Err(bdError(`Bead "${id}" not found`, { id }));
    }
    return normalizeBeadData(parsed.data[0]);
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
    const result = await runBdRetry(args);
    if (!result.ok) return result;
    const parsed = parseJsonOutput<Record<string, unknown>[]>(result.data);
    if (!parsed.ok) return parsed;
    return collectBeads(parsed.data);
  }

  async ready(): Promise<Result<BeadData[], DomainError>> {
    const result = await runBdRetry(['ready', '--json']);
    if (!result.ok) return result;
    const parsed = parseJsonOutput<Record<string, unknown>[]>(result.data);
    if (!parsed.ok) return parsed;
    return collectBeads(parsed.data);
  }

  async updateStatus(id: string, status: string): Promise<Result<void, DomainError>> {
    const r = await runBd(['update', id, '-s', status]);
    if (!r.ok) return r;
    return Ok(undefined);
  }

  async claim(id: string): Promise<Result<void, DomainError>> {
    // Atomically sets assignee + status to in_progress
    const r = await runBdRetry(['update', id, '--claim']);
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
