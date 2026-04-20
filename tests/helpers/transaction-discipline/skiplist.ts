/**
 * Explicit exemptions from transaction-wrap discipline.
 *
 * Two categories are legitimate:
 *   1. Read-only bootstrap paths that happen to call a method whose name
 *      matches the mutating prefix list but that does not actually mutate.
 *   2. Adapter lifecycle calls (init, checkpoint, close).
 *
 * Entries take the form `{ filePath, line, methodName, reason }`.
 * New entries require a one-line `reason` that explains why the call is
 * legitimately outside a transaction. Reviewers should reject new entries
 * that don't fit the two categories above.
 */

export interface Exemption {
  filePath: string;
  line: number;
  methodName: string;
  reason: string;
}

export const SKIPLIST: Exemption[] = [
  // Example format — empty until populated during baseline:
  // {
  //   filePath: "/abs/path/to/file.ts",
  //   line: 42,
  //   methodName: "closeAdapter",
  //   reason: "lifecycle; runs after the tx is committed",
  // },
];

export const isExempt = (
  filePath: string,
  line: number,
  methodName: string,
): boolean =>
  SKIPLIST.some(
    (e) =>
      e.filePath.endsWith(filePath) && e.line === line && e.methodName === methodName,
  );
