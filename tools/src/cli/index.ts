import { projectInitCmd } from './commands/project-init.cmd.js';
import { projectGetCmd } from './commands/project-get.cmd.js';
import { milestoneCreateCmd } from './commands/milestone-create.cmd.js';
import { milestoneListCmd } from './commands/milestone-list.cmd.js';
import { sliceCreateCmd } from './commands/slice-create.cmd.js';
import { sliceTransitionCmd } from './commands/slice-transition.cmd.js';
import { sliceClassifyCmd } from './commands/slice-classify.cmd.js';
import { wavesDetectCmd } from './commands/waves-detect.cmd.js';
import { syncStateCmd } from './commands/sync-state.cmd.js';
import { syncReconcileCmd } from './commands/sync-reconcile.cmd.js';
import { worktreeCreateCmd } from './commands/worktree-create.cmd.js';
import { worktreeDeleteCmd } from './commands/worktree-delete.cmd.js';
import { worktreeListCmd } from './commands/worktree-list.cmd.js';
import { reviewCheckFreshCmd } from './commands/review-check-fresh.cmd.js';
import { checkpointSaveCmd } from './commands/checkpoint-save.cmd.js';
import { checkpointLoadCmd } from './commands/checkpoint-load.cmd.js';
import { observeRecordCmd } from './commands/observe-record.cmd.js';
import { patternsExtractCmd } from './commands/patterns-extract.cmd.js';
import { patternsAggregateCmd } from './commands/patterns-aggregate.cmd.js';
import { patternsRankCmd } from './commands/patterns-rank.cmd.js';
import { composeDetectCmd } from './commands/compose-detect.cmd.js';
import { skillsDriftCmd } from './commands/skills-drift.cmd.js';
import { skillsValidateCmd } from './commands/skills-validate.cmd.js';
import { workflowNextCmd } from './commands/workflow-next.cmd.js';
import { workflowShouldAutoCmd } from './commands/workflow-should-auto.cmd.js';
import { snapshotSaveCmd } from './commands/snapshot-save.cmd.js';
import { snapshotLoadCmd } from './commands/snapshot-load.cmd.js';
import { snapshotMergeCmd } from './commands/snapshot-merge.cmd.js';

type CommandFn = (args: string[]) => Promise<string>;

const commands: Record<string, CommandFn> = {
  'project:init': projectInitCmd,
  'project:get': projectGetCmd,
  'milestone:create': milestoneCreateCmd,
  'milestone:list': milestoneListCmd,
  'slice:create': sliceCreateCmd,
  'slice:transition': sliceTransitionCmd,
  'slice:classify': sliceClassifyCmd,
  'waves:detect': wavesDetectCmd,
  'sync:state': syncStateCmd,
  'sync:reconcile': syncReconcileCmd,
  'worktree:create': worktreeCreateCmd,
  'worktree:delete': worktreeDeleteCmd,
  'worktree:list': worktreeListCmd,
  'review:check-fresh': reviewCheckFreshCmd,
  'checkpoint:save': checkpointSaveCmd,
  'checkpoint:load': checkpointLoadCmd,
  'observe:record': observeRecordCmd,
  'patterns:extract': patternsExtractCmd,
  'patterns:aggregate': patternsAggregateCmd,
  'patterns:rank': patternsRankCmd,
  'compose:detect': composeDetectCmd,
  'skills:drift': skillsDriftCmd,
  'skills:validate': skillsValidateCmd,
  'workflow:next': workflowNextCmd,
  'workflow:should-auto': workflowShouldAutoCmd,
  'snapshot:save': snapshotSaveCmd,
  'snapshot:load': snapshotLoadCmd,
  'snapshot:merge': snapshotMergeCmd,
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h') {
    console.log(JSON.stringify({
      ok: true,
      data: { name: 'tff-tools', version: '0.4.0', commands: Object.keys(commands) },
    }));
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.log(JSON.stringify({
      ok: false,
      error: { code: 'UNKNOWN_COMMAND', message: `Unknown command "${command}". Run --help for available commands.` },
    }));
    return;
  }

  const output = await handler(args);
  console.log(output);
};

main().catch((err) => {
  console.log(JSON.stringify({
    ok: false,
    error: { code: 'INTERNAL_ERROR', message: String(err) },
  }));
  process.exit(1);
});
