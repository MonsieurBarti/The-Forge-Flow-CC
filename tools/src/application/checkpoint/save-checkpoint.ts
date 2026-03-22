import { type Result, Ok } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';

export interface CheckpointData {
  sliceId: string; baseCommit: string; currentWave: number;
  completedWaves: number[]; completedTasks: string[];
  executorLog: Array<{ taskRef: string; agent: string }>;
}

interface SaveCheckpointDeps { artifactStore: ArtifactStore; }

export const saveCheckpoint = async (
  data: CheckpointData, deps: SaveCheckpointDeps,
): Promise<Result<void, DomainError>> => {
  const lines: string[] = [
    `# Checkpoint — ${data.sliceId}`,
    `- Base commit: ${data.baseCommit}`,
    `- Current wave: ${data.currentWave}`,
    `- Completed waves: [${data.completedWaves.join(', ')}]`,
    `- Completed tasks: [${data.completedTasks.join(', ')}]`,
    `- Executor log: ${data.executorLog.map((e) => `${e.agent}→${e.taskRef}`).join(', ')}`,
    '', `<!-- checkpoint-json: ${JSON.stringify(data)} -->`, '',
  ];
  const milestoneId = data.sliceId.match(/^(M\d+)/)?.[1] ?? 'M01';
  const path = `.tff/milestones/${milestoneId}/slices/${data.sliceId}/CHECKPOINT.md`;
  await deps.artifactStore.mkdir(`.tff/milestones/${milestoneId}/slices/${data.sliceId}`);
  await deps.artifactStore.write(path, lines.join('\n'));
  return Ok(undefined);
};
