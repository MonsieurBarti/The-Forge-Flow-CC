import { branchMergeCmd } from './commands/branch-merge.cmd.js';
import { checkpointLoadCmd } from './commands/checkpoint-load.cmd.js';
import { checkpointSaveCmd } from './commands/checkpoint-save.cmd.js';
import { claimCheckStaleCmd } from './commands/claim-check-stale.cmd.js';
import { composeDetectCmd } from './commands/compose-detect.cmd.js';
import { depAddCmd } from './commands/dep-add.cmd.js';
import { hookPostCheckoutCmd } from './commands/hook-post-checkout.cmd.js';
import { milestoneCloseCmd } from './commands/milestone-close.cmd.js';
import { milestoneCreateCmd } from './commands/milestone-create.cmd.js';
import { milestoneListCmd } from './commands/milestone-list.cmd.js';
import { observeRecordCmd } from './commands/observe-record.cmd.js';
import { patternsAggregateCmd } from './commands/patterns-aggregate.cmd.js';
import { patternsExtractCmd } from './commands/patterns-extract.cmd.js';
import { patternsRankCmd } from './commands/patterns-rank.cmd.js';
import { projectGetCmd } from './commands/project-get.cmd.js';
import { projectInitCmd } from './commands/project-init.cmd.js';
import { restoreBranchCmd } from './commands/restore-branch.cmd.js';
import { reviewCheckFreshCmd } from './commands/review-check-fresh.cmd.js';
import { reviewRecordCmd } from './commands/review-record.cmd.js';
import { sessionRemindCmd } from './commands/session-remind.cmd.js';
import { skillsDriftCmd } from './commands/skills-drift.cmd.js';
import { skillsValidateCmd } from './commands/skills-validate.cmd.js';
import { sliceClassifyCmd } from './commands/slice-classify.cmd.js';
import { sliceCloseCmd } from './commands/slice-close.cmd.js';
import { sliceCreateCmd } from './commands/slice-create.cmd.js';
import { sliceListCmd } from './commands/slice-list.cmd.js';
import { sliceTransitionCmd } from './commands/slice-transition.cmd.js';
import { stateRepairCmd } from './commands/state-repair.cmd.js';
import { syncBranchCmd } from './commands/sync-branch.cmd.js';
import { syncStateCmd } from './commands/sync-state.cmd.js';
import { taskClaimCmd } from './commands/task-claim.cmd.js';
import { taskCloseCmd } from './commands/task-close.cmd.js';
import { taskReadyCmd } from './commands/task-ready.cmd.js';
import { wavesDetectCmd } from './commands/waves-detect.cmd.js';
import { workflowNextCmd } from './commands/workflow-next.cmd.js';
import { workflowShouldAutoCmd } from './commands/workflow-should-auto.cmd.js';
import { worktreeCreateCmd } from './commands/worktree-create.cmd.js';
import { worktreeDeleteCmd } from './commands/worktree-delete.cmd.js';
import { worktreeListCmd } from './commands/worktree-list.cmd.js';

type CommandFn = (args: string[]) => Promise<string>;

const commands: Record<string, CommandFn> = {
  'project:init': projectInitCmd,
  'project:get': projectGetCmd,
  'milestone:create': milestoneCreateCmd,
  'milestone:list': milestoneListCmd,
  'milestone:close': milestoneCloseCmd,
  'slice:create': sliceCreateCmd,
  'slice:list': sliceListCmd,
  'slice:transition': sliceTransitionCmd,
  'slice:close': sliceCloseCmd,
  'slice:classify': sliceClassifyCmd,
  'task:claim': taskClaimCmd,
  'task:close': taskCloseCmd,
  'task:ready': taskReadyCmd,
  'dep:add': depAddCmd,
  'waves:detect': wavesDetectCmd,
  'sync:state': syncStateCmd,
  'sync:branch': syncBranchCmd,
  'state:repair': stateRepairCmd,
  'worktree:create': worktreeCreateCmd,
  'worktree:delete': worktreeDeleteCmd,
  'worktree:list': worktreeListCmd,
  'review:check-fresh': reviewCheckFreshCmd,
  'review:record': reviewRecordCmd,
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
  'claim:check-stale': claimCheckStaleCmd,
  'restore:branch': restoreBranchCmd,
  'branch:merge': branchMergeCmd,
  'hook:post-checkout': hookPostCheckoutCmd,
  'session:remind': sessionRemindCmd,
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h') {
    console.log(
      JSON.stringify({
        ok: true,
        data: { name: 'tff-tools', version: '0.7.0', commands: Object.keys(commands) },
      }),
    );
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.log(
      JSON.stringify({
        ok: false,
        error: { code: 'UNKNOWN_COMMAND', message: `Unknown command "${command}". Run --help for available commands.` },
      }),
    );
    return;
  }

  const output = await handler(args);
  console.log(output);
};

main().catch((err) => {
  console.log(
    JSON.stringify({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: String(err) },
    }),
  );
  process.exit(1);
});
