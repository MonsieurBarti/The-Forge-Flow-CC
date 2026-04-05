export class BranchMismatchError extends Error {
  public readonly repairHint: string;

  constructor(
    public readonly expectedBranch: string,
    public readonly currentBranch: string,
    public readonly stampPath: string = '.tff/branch-meta.json',
  ) {
    super(
      `Branch mismatch: ${stampPath} shows state for "${expectedBranch}" but HEAD is "${currentBranch}". ` +
      `Run /tff:repair to reconcile or switch to the correct branch.`
    );
    this.name = 'BranchMismatchError';
    this.repairHint = `/tff:repair (or git checkout ${expectedBranch})`;
  }
}
