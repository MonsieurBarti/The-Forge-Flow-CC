import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '../../../domain/result.js';
import { MarkdownArtifactAdapter } from './markdown-artifact.adapter.js';

describe('MarkdownArtifactAdapter', () => {
  let adapter: MarkdownArtifactAdapter;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'tff-test-'));
    adapter = new MarkdownArtifactAdapter(tempDir);
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should write and read a file', async () => {
    await adapter.write('test.md', '# Hello');
    const result = await adapter.read('test.md');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.data).toBe('# Hello');
  });

  it('should return error for non-existent file', async () => {
    const result = await adapter.read('nope.md');
    expect(isErr(result)).toBe(true);
  });

  it('should report file existence', async () => {
    expect(await adapter.exists('test.md')).toBe(false);
    await adapter.write('test.md', 'content');
    expect(await adapter.exists('test.md')).toBe(true);
  });

  it('should create directories', async () => {
    await adapter.mkdir('sub/dir');
    await adapter.write('sub/dir/file.md', 'nested');
    const result = await adapter.read('sub/dir/file.md');
    expect(isOk(result)).toBe(true);
  });

  it('should list files in directory', async () => {
    await adapter.mkdir('docs');
    await adapter.write('docs/a.md', 'a');
    await adapter.write('docs/b.md', 'b');
    const result = await adapter.list('docs');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.data).toHaveLength(2);
  });
});
