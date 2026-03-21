import { runBeadStoreContractTests } from '../../../domain/ports/bead-store.contract.spec';
import { MarkdownBeadAdapter } from './markdown-bead.adapter';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

runBeadStoreContractTests('MarkdownBeadAdapter', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tff-md-bead-'));
  return new MarkdownBeadAdapter(dir);
});
