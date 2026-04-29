import fs from "node:fs";
import path from "node:path";
import { assertNotOnDefaultBranch } from "../../application/guards/branch-guard.js";
import { assertNotOnMilestoneBranch } from "../../application/guards/milestone-branch-guard.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import {
	type ClosableStateStores,
	createClosableStateStoresUnchecked,
} from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { resolveRepoRoot } from "../../infrastructure/home-directory.js";

export const WITH_MUTATING_COMMAND_TAG = Symbol("with-mutating-command");

const SENTINEL_REL = ".tff-cc/observations/.mutating-cli-ran";

export const touchMutatingSentinel = (root: string): void => {
	try {
		const abs = path.join(root, SENTINEL_REL);
		fs.mkdirSync(path.dirname(abs), { recursive: true });
		if (!fs.existsSync(abs)) fs.writeFileSync(abs, "", "utf8");
	} catch {
		// Silent — observability should never break a mutating command.
	}
};

type Handler = (args: string[]) => Promise<string>;

interface TaggedHandler extends Handler {
	readonly [WITH_MUTATING_COMMAND_TAG]: true;
}

interface WrapperDeps {
	gitFactory?: () => GitOps;
	commandName?: string;
}

// Bootstrap/teardown commands that MUST run on a milestone branch — the
// milestone-branch-guard's "switch to slice worktree" remediation is impossible
// here because these commands are how you create/destroy that worktree.
const MILESTONE_GUARD_EXEMPT = new Set<string>(["worktree:create", "worktree:delete"]);

// Module-level cache: migrations and DB init run once per process.
let _cachedStores: ClosableStateStores | null = null;

const getStores = (): ClosableStateStores => {
	if (!_cachedStores) {
		_cachedStores = createClosableStateStoresUnchecked();
	}
	return _cachedStores;
};

/**
 * Reset the module-level store cache. Use in test teardown to prevent
 * connection leaks when tests run multiple withMutatingCommand invocations
 * within a single process.
 */
export const resetMutatingCommandCache = (): void => {
	_cachedStores = null;
};

export const withMutatingCommand = (handler: Handler, deps?: WrapperDeps): TaggedHandler => {
	const wrapped = async (args: string[]): Promise<string> => {
		const git = deps?.gitFactory ? deps.gitFactory() : new GitCliAdapter(process.cwd());

		const defaultGuard = await assertNotOnDefaultBranch(git, "cli:mutating");
		if (!defaultGuard.ok) {
			return JSON.stringify({ ok: false, error: defaultGuard.error });
		}

		const isMilestoneGuardExempt =
			deps?.commandName !== undefined && MILESTONE_GUARD_EXEMPT.has(deps.commandName);
		if (process.env.TFF_ALLOW_MILESTONE_COMMIT !== "1" && !isMilestoneGuardExempt) {
			const stores = getStores();
			const milestoneGuard = await assertNotOnMilestoneBranch(
				git,
				"cli:mutating",
				stores.sliceStore,
				stores.milestoneStore,
			);
			if (!milestoneGuard.ok) {
				return JSON.stringify({ ok: false, error: milestoneGuard.error });
			}
		}

		// Fire on attempt (after guards pass), not on handler success — the sentinel
		// means "a mutating command reached the handler," which is what the first-
		// observation probe needs.
		touchMutatingSentinel(resolveRepoRoot(process.cwd()));
		return handler(args);
	};

	Object.defineProperty(wrapped, WITH_MUTATING_COMMAND_TAG, {
		value: true,
		enumerable: false,
		writable: false,
	});

	return wrapped as TaggedHandler;
};

export const isWrappedMutating = (h: unknown): boolean =>
	typeof h === "function" &&
	(h as unknown as Record<symbol, unknown>)[WITH_MUTATING_COMMAND_TAG] === true;
