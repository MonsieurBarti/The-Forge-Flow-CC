import { type Result, Ok, Err } from '../../domain/result.js';
import { type Wave } from '../../domain/value-objects/wave.js';
import { type DomainError, createDomainError } from '../../domain/errors/domain-error.js';

interface TaskDep { id: string; dependsOn: string[]; }

export const detectWaves = (tasks: TaskDep[]): Result<Wave[], DomainError> => {
  if (tasks.length === 0) return Ok([]);

  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const task of tasks) { inDegree.set(task.id, 0); dependents.set(task.id, []); }
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
      const deps = dependents.get(dep) ?? [];
      deps.push(task.id);
      dependents.set(dep, deps);
    }
  }

  const waves: Wave[] = [];
  let remaining = tasks.length;
  // Sort for deterministic wave ordering (stable test assertions, reproducible plans)
  let currentWave = [...inDegree.entries()].filter(([_, deg]) => deg === 0).map(([id]) => id).sort();
  let waveIndex = 0;

  while (currentWave.length > 0) {
    waves.push({ index: waveIndex, taskIds: currentWave });
    remaining -= currentWave.length;
    const nextWave: string[] = [];
    for (const taskId of currentWave) {
      for (const dependent of dependents.get(taskId) ?? []) {
        const newDeg = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDeg);
        if (newDeg === 0) nextWave.push(dependent);
      }
    }
    // Sort for deterministic wave ordering (stable test assertions, reproducible plans)
    currentWave = nextWave.sort();
    waveIndex++;
  }

  if (remaining > 0) {
    // Sort for deterministic wave ordering (stable test assertions, reproducible plans)
    const cycleIds = [...inDegree.entries()].filter(([_, deg]) => deg > 0).map(([id]) => id).sort();
    return Err(createDomainError('INVALID_TRANSITION', `Circular dependency detected among tasks: ${cycleIds.join(', ')}`, { remaining, cycleIds }));
  }
  return Ok(waves);
};
