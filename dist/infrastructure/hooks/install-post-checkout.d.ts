/**
 * Install post-checkout hook in the git repository at repoDir.
 * - If an existing non-tff hook exists, renames it to post-checkout.pre-tff
 * - If an existing tff hook exists, overwrites it
 * - Creates .git/hooks/ directory if needed
 */
export declare function installPostCheckoutHook(repoDir: string): void;
//# sourceMappingURL=install-post-checkout.d.ts.map