import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installPostCheckoutHook } from '../../../src/infrastructure/install-post-checkout.js';
import { TFF_HOOK_MARKER } from '../../../src/infrastructure/post-checkout-template.js';

describe('installPostCheckoutHook', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(os.tmpdir(), `tff-hook-install-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
    execSync('git init', { cwd: tmpDir, stdio: 'ignore', env });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('installs hook with executable permissions', () => {
    installPostCheckoutHook(tmpDir);
    const hookPath = join(tmpDir, '.git', 'hooks', 'post-checkout');
    expect(existsSync(hookPath)).toBe(true);
    const mode = statSync(hookPath).mode;
    expect(mode & 0o111).toBeTruthy();
  });

  it('contains tff marker', () => {
    installPostCheckoutHook(tmpDir);
    const hookPath = join(tmpDir, '.git', 'hooks', 'post-checkout');
    expect(readFileSync(hookPath, 'utf8')).toContain(TFF_HOOK_MARKER);
  });

  it('renames existing non-tff hook to .pre-tff', () => {
    const hooksDir = join(tmpDir, '.git', 'hooks');
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(join(hooksDir, 'post-checkout'), '#!/bin/sh\necho existing', { mode: 0o755 });

    installPostCheckoutHook(tmpDir);

    expect(existsSync(join(hooksDir, 'post-checkout.pre-tff'))).toBe(true);
    const preTff = readFileSync(join(hooksDir, 'post-checkout.pre-tff'), 'utf8');
    expect(preTff).toContain('echo existing');
    expect(readFileSync(join(hooksDir, 'post-checkout'), 'utf8')).toContain(TFF_HOOK_MARKER);
  });

  it('overwrites existing tff hook without creating .pre-tff', () => {
    const hooksDir = join(tmpDir, '.git', 'hooks');
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(join(hooksDir, 'post-checkout'), `#!/bin/sh\n${TFF_HOOK_MARKER}\nold version`, { mode: 0o755 });

    installPostCheckoutHook(tmpDir);

    expect(existsSync(join(hooksDir, 'post-checkout.pre-tff'))).toBe(false);
    expect(readFileSync(join(hooksDir, 'post-checkout'), 'utf8')).toContain(TFF_HOOK_MARKER);
  });
});
