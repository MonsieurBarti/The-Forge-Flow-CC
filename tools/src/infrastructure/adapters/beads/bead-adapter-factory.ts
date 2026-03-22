import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { BeadStore } from '../../../domain/ports/bead-store.port.js';
import { tffWarn } from '../logging/warn.js';
import { BdCliAdapter } from './bd-cli.adapter.js';
import { MarkdownBeadAdapter } from './markdown-bead.adapter.js';

const exec = promisify(execFile);

interface FactoryOpts {
  checkBd?: () => Promise<boolean>;
  basePath?: string;
}

interface AdapterResult {
  store: BeadStore;
  type: 'beads' | 'markdown';
}

async function defaultCheckBd(): Promise<boolean> {
  try {
    await exec('bd', ['--version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function createBeadAdapter(opts: FactoryOpts = {}): Promise<AdapterResult> {
  const checkBd = opts.checkBd ?? defaultCheckBd;
  const basePath = opts.basePath ?? process.cwd();
  if (await checkBd()) {
    tffWarn('using beads adapter: bd-cli');
    return { store: new BdCliAdapter(), type: 'beads' };
  }
  tffWarn('using beads adapter: markdown-fallback');
  return { store: new MarkdownBeadAdapter(basePath), type: 'markdown' };
}
