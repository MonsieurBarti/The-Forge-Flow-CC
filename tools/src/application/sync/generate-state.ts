import type { DomainError } from '../../domain/errors/domain-error.js';
import type { ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import type { BeadStore } from '../../domain/ports/bead-store.port.js';
import { isOk, Ok, type Result } from '../../domain/result.js';

interface GenerateStateInput {
  milestoneId: string;
  milestoneName: string;
}
interface GenerateStateDeps {
  beadStore: BeadStore;
  artifactStore: ArtifactStore;
}

export const generateState = async (
  input: GenerateStateInput,
  deps: GenerateStateDeps,
): Promise<Result<void, DomainError>> => {
  const slicesResult = await deps.beadStore.list({ label: 'tff:slice', parentId: input.milestoneId });
  if (!isOk(slicesResult)) return slicesResult;
  const slices = slicesResult.data;

  const sliceStats: Array<{ title: string; status: string; totalTasks: number; closedTasks: number }> = [];
  let totalTasks = 0;
  let closedTasks = 0;

  for (const slice of slices) {
    const tasksResult = await deps.beadStore.list({ label: 'tff:task', parentId: slice.id });
    const tasks = isOk(tasksResult) ? tasksResult.data : [];
    const sliceClosed = tasks.filter((t) => t.status === 'closed').length;
    sliceStats.push({ title: slice.title, status: slice.status, totalTasks: tasks.length, closedTasks: sliceClosed });
    totalTasks += tasks.length;
    closedTasks += sliceClosed;
  }

  const closedSlices = slices.filter((s) => s.status === 'closed').length;
  const lines: string[] = [
    `# State — ${input.milestoneName}`,
    '',
    '## Progress',
    `- Slices: ${closedSlices}/${slices.length} completed`,
    `- Tasks: ${closedTasks}/${totalTasks} completed`,
    '',
  ];

  if (sliceStats.length > 0) {
    lines.push('## Slices', '| Slice | Status | Tasks | Progress |', '|---|---|---|---|');
    for (const stat of sliceStats) {
      const pct = stat.totalTasks > 0 ? Math.round((stat.closedTasks / stat.totalTasks) * 100) : 0;
      lines.push(`| ${stat.title} | ${stat.status} | ${stat.closedTasks}/${stat.totalTasks} | ${pct}% |`);
    }
  }
  lines.push('');
  await deps.artifactStore.write('.tff/STATE.md', lines.join('\n'));
  return Ok(undefined);
};
