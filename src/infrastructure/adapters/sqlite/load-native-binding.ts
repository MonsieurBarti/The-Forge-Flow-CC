import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Resolves the platform-specific better_sqlite3 native binding path.
 * In the built CLI (dist/), the .node file is co-located.
 * In dev/test, returns undefined so better-sqlite3 uses standard node_modules resolution.
 */
export function getNativeBindingPath(dirname?: string): string | undefined {
  const dir = dirname ?? __dirname;
  const bindingFile = `better_sqlite3.${process.platform}-${process.arch}.node`;
  const bindingPath = path.join(dir, bindingFile);
  if (existsSync(bindingPath)) return bindingPath;
  return undefined;
}
