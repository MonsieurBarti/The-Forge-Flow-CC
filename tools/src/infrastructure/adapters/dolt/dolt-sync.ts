import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

interface DoltConfig {
  remote: string;
  'auto-sync'?: boolean;
}

interface DoltAwareSettings {
  dolt?: DoltConfig;
}

interface DoltSettings {
  remote: string;
  autoSync: boolean;
}

export function parseDoltSettings(settings: DoltAwareSettings | undefined): DoltSettings | null {
  const dolt = settings?.dolt;
  if (!dolt?.remote) return null;
  return { remote: dolt.remote, autoSync: dolt['auto-sync'] === true };
}

export function shouldAutoSync(settings: DoltAwareSettings | undefined): boolean {
  return parseDoltSettings(settings)?.autoSync === true;
}

const VALID_REMOTE = /^[a-zA-Z0-9_-]+$/;

function validateRemote(remote: string): void {
  if (!VALID_REMOTE.test(remote)) {
    throw new Error(`Invalid Dolt remote name: "${remote}". Must be alphanumeric, hyphens, or underscores only.`);
  }
}

export async function doltPush(remote: string): Promise<void> {
  try {
    validateRemote(remote);
    await exec('dolt', ['push', remote], { timeout: 30000, cwd: process.cwd() });
  } catch { /* non-blocking */ }
}

export async function doltPull(remote: string): Promise<void> {
  try {
    validateRemote(remote);
    await exec('dolt', ['pull', remote], { timeout: 30000, cwd: process.cwd() });
  } catch { /* non-blocking */ }
}
