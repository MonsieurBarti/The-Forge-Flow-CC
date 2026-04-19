import { resolve } from "node:path";
import { STATE_FILE } from "../../shared/paths.js";
import { mkdirTracked } from "./track-mkdir.js";

export interface StagedStateMd {
	stateFinalAbs: string;
	stateTmpAbs: string;
}

/**
 * Stage the STATE.md tmp path for a writer-in-transaction. Creates the
 * `.tff-cc/` directory if needed, tracks newly-created dirs in
 * `stagedDirs` (leaf-first) so withTransaction can clean them up on rollback,
 * and registers `stateTmpAbs` in `stagedTmps` so it is unlinked if the body
 * throws. Callers are responsible for writing the tmp file content inside the
 * tx body and returning `[stateTmpAbs, stateFinalAbs]` in the `tmpRenames`
 * list so withTransaction renames it atomically on commit.
 *
 * Extracted from slice:transition, slice:create, milestone:create which all
 * share the identical three-line staging preamble.
 */
export function stageStateMdTmp(
	cwd: string,
	stagedTmps: string[],
	stagedDirs: string[],
): StagedStateMd {
	const stateFinalAbs = resolve(cwd, STATE_FILE);
	const stateTmpAbs = `${stateFinalAbs}.tmp`;
	stagedDirs.push(...mkdirTracked(resolve(cwd, ".tff-cc")));
	stagedTmps.push(stateTmpAbs);
	return { stateFinalAbs, stateTmpAbs };
}
