export class BranchMismatchError extends Error {
  constructor(
    public readonly expectedBranch: string,
    public readonly currentBranch: string,
  ) {
    super(
      `Branch mismatch: .tff/ state is for "${expectedBranch}" but current branch is "${currentBranch}"`,
    );
    this.name = 'BranchMismatchError';
  }
}
