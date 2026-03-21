export const syncReconcileCmd = async (_args: string[]): Promise<string> => {
  // Reconciliation is complex — delegated to workflow-level orchestration
  // The workflow calls sync:state for the beads→md direction
  // Full bidirectional reconciliation is deferred to a future plan
  return JSON.stringify({
    ok: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Full reconciliation not yet implemented. Use sync:state for beads→markdown sync.' },
  });
};
