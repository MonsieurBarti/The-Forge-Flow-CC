import { execSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { postCheckoutHookScript, TFF_HOOK_MARKER } from './post-checkout-template.js';

/**
 * Install post-checkout hook in the git repository at repoDir.
 * - If an existing non-tff hook exists, renames it to post-checkout.pre-tff
 * - If an existing tff hook exists, overwrites it
 * - Creates .git/hooks/ directory if needed
 */
export function installPostCheckoutHook(repoDir: string): void {
  // Resolve hook directory (handles worktrees via --git-common-dir)
  let gitCommonDir: string;
  try {
    gitCommonDir = execSync('git rev-parse --git-common-dir', {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();
  } catch {
    return; // Not a git repo
  }

  // Resolve to absolute path
  if (!path.isAbsolute(gitCommonDir)) {
    gitCommonDir = path.resolve(repoDir, gitCommonDir);
  }

  const hooksDir = path.join(gitCommonDir, 'hooks');
  mkdirSync(hooksDir, { recursive: true });

  const hookPath = path.join(hooksDir, 'post-checkout');
  const preTffPath = path.join(hooksDir, 'post-checkout.pre-tff');

  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, 'utf8');
    if (existing.includes(TFF_HOOK_MARKER)) {
      // Our hook — overwrite
    } else {
      // Third-party hook — rename to .pre-tff
      renameSync(hookPath, preTffPath);
    }
  }

  writeFileSync(hookPath, postCheckoutHookScript, { mode: 0o755 });
  chmodSync(hookPath, 0o755);
}
