import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

interface DoltSettings {
  remote: string;
  autoSync: boolean;
}

export function parseDoltSettings(settings: Record<string, any> | undefined): DoltSettings | null {
  const dolt = settings?.dolt;
  if (!dolt?.remote) return null;
  return { remote: dolt.remote, autoSync: dolt['auto-sync'] === true };
}

export function shouldAutoSync(settings: Record<string, any> | undefined): boolean {
  return parseDoltSettings(settings)?.autoSync === true;
}

export async function doltPush(remote: string): Promise<void> {
  try {
    await exec('dolt', ['push', remote], { timeout: 30000, cwd: process.cwd() });
  } catch { /* non-blocking */ }
}

export async function doltPull(remote: string): Promise<void> {
  try {
    await exec('dolt', ['pull', remote], { timeout: 30000, cwd: process.cwd() });
  } catch { /* non-blocking */ }
}
