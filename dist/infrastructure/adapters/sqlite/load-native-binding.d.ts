/**
 * Resolves the platform-specific better_sqlite3 native binding path.
 * In the built CLI (dist/), the .node file is co-located.
 * In dev/test, returns undefined so better-sqlite3 uses standard node_modules resolution.
 */
export declare function getNativeBindingPath(dirname?: string): string | undefined;
//# sourceMappingURL=load-native-binding.d.ts.map