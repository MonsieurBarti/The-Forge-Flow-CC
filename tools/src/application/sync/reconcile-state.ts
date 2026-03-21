import { type Result, Ok, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type BeadStore, type BeadData } from '../../domain/ports/bead-store.port.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import { type SyncReport, emptySyncReport } from '../../domain/value-objects/sync-report.js';
import { generateState } from './generate-state.js';

interface ReconcileInput {
  milestoneId: string;
  milestoneName: string;
}

interface ReconcileDeps {
  beadStore: BeadStore;
  artifactStore: ArtifactStore;
}

export const reconcileState = async (
  input: ReconcileInput,
  deps: ReconcileDeps,
): Promise<Result<SyncReport, DomainError>> => {
  const report = emptySyncReport();

  // 1. Load all beads for this milestone
  const slicesResult = await deps.beadStore.list({
    label: 'tff:slice',
    parentId: input.milestoneId,
  });
  if (!isOk(slicesResult)) return slicesResult;
  const sliceBeads = slicesResult.data;

  // 2. Load all slice markdown files and extract unique slice directory names
  const sliceFilesResult = await deps.artifactStore.list('.tff/slices');
  const sliceFiles = isOk(sliceFilesResult) ? sliceFilesResult.data : [];

  // Extract slice IDs from file paths
  // e.g., ".tff/slices/M01-S01/PLAN.md" → "M01-S01"
  const prefix = '.tff/slices/';
  const mdSliceIds = new Set(
    sliceFiles
      .filter((f) => f.startsWith(prefix))
      .map((f) => {
        const rest = f.slice(prefix.length);
        const slashIdx = rest.indexOf('/');
        return slashIdx > 0 ? rest.slice(0, slashIdx) : rest;
      })
      .filter((id) => id.length > 0),
  );

  // 3. For each bead slice: check if markdown exists
  for (const bead of sliceBeads) {
    const sliceDir = `.tff/slices/${bead.title}`;
    const planPath = `${sliceDir}/PLAN.md`;

    if (!(await deps.artifactStore.exists(planPath))) {
      // Bead exists but no markdown → generate markdown from bead
      await deps.artifactStore.mkdir(sliceDir);
      const content = `# Plan — ${bead.title}\n\n${bead.design ?? '_No plan yet._'}\n`;
      await deps.artifactStore.write(planPath, content);
      report.created.push({ entityId: bead.id, source: 'beads' });
    } else {
      // Both exist → sync content (md wins) and status (beads wins)
      const mdResult = await deps.artifactStore.read(planPath);
      if (isOk(mdResult)) {
        const mdContent = mdResult.data;
        const beadDesign = bead.design ?? '';

        // Content: markdown wins → update bead if different
        if (mdContent !== beadDesign && mdContent.length > 0) {
          await deps.beadStore.updateDesign(bead.id, mdContent);
          report.updated.push({
            entityId: bead.id,
            field: 'design',
            source: 'markdown',
          });
        }
      }
    }

    // Remove from mdSliceIds to track what's left (orphans)
    mdSliceIds.delete(bead.title);
  }

  // 4. Remaining mdSliceIds are markdown-only (no bead) → create beads
  for (const sliceId of mdSliceIds) {
    const planPath = `.tff/slices/${sliceId}/PLAN.md`;
    if (await deps.artifactStore.exists(planPath)) {
      const mdResult = await deps.artifactStore.read(planPath);
      const design = isOk(mdResult) ? mdResult.data : '';

      const beadResult = await deps.beadStore.create({
        label: 'tff:slice',
        title: sliceId,
        design,
        parentId: input.milestoneId,
      });

      if (isOk(beadResult)) {
        report.created.push({ entityId: beadResult.data.id, source: 'markdown' });
      }
    }
  }

  // 5. Regenerate STATE.md (always derived from beads)
  await generateState(input, deps);

  return Ok(report);
};
