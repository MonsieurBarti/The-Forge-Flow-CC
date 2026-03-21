import { projectInitCmd } from './commands/project-init.cmd.js';
import { sliceClassifyCmd } from './commands/slice-classify.cmd.js';
import { wavesDetectCmd } from './commands/waves-detect.cmd.js';
import { reviewCheckFreshCmd } from './commands/review-check-fresh.cmd.js';

type CommandFn = (args: string[]) => Promise<string>;

const commands: Record<string, CommandFn> = {
  'project:init': projectInitCmd,
  'slice:classify': sliceClassifyCmd,
  'waves:detect': wavesDetectCmd,
  'review:check-fresh': reviewCheckFreshCmd,
};

const allCommands = [
  'project:init', 'project:get', 'milestone:create', 'milestone:list',
  'slice:create', 'slice:transition', 'slice:classify', 'waves:detect',
  'sync:reconcile', 'sync:state', 'worktree:create', 'worktree:delete',
  'worktree:list', 'review:record', 'review:check-fresh',
  'checkpoint:save', 'checkpoint:load',
];

const main = async () => {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h') {
    console.log(JSON.stringify({ ok: true, data: { name: 'tff-tools', version: '0.1.0', commands: allCommands } }));
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.log(JSON.stringify({ ok: false, error: { code: 'NOT_IMPLEMENTED', message: `Command "${command}" not yet implemented` } }));
    return;
  }

  const output = await handler(args);
  console.log(output);
};

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: { code: 'INTERNAL_ERROR', message: String(err) } }));
  process.exit(1);
});
