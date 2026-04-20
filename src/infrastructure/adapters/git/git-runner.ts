export type GitRunner = (cmd: string, args: string[], opts: { cwd: string }) => Promise<string>;
