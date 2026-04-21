import { assertNotOnDefaultBranch } from "../../application/guards/branch-guard.js";
import { assertNotOnMilestoneBranch } from "../../application/guards/milestone-branch-guard.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import {
	type ClosableStateStores,
	createClosableStateStoresUnchecked,
} from "../../infrastructure/adapters/sqlite/create-state-stores.js";

export const WITH_MUTATING_COMMAND_TAG = Symbol("with-mutating-command");

type Handler = (args: string[]) => Promise<string>;

interface TaggedHandler extends Handler {
	readonly [WITH_MUTATING_COMMAND_TAG]: true;
}

interface WrapperDeps {
	gitFactory?: () => GitOps;
}

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

		if (process.env.TFF_ALLOW_MILESTONE_COMMIT !== "1") {
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
