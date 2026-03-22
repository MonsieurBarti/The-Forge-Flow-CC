import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBeadStoreContractTests } from '../../../domain/ports/bead-store.contract.spec';
import { MarkdownBeadAdapter } from './markdown-bead.adapter';

runBeadStoreContractTests('MarkdownBeadAdapter', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tff-md-bead-'));
  return new MarkdownBeadAdapter(dir);
});
