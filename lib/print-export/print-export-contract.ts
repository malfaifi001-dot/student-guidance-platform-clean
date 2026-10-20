export type PortfolioPrintTargetState = {
  targetKind: string | null;
  ready: boolean;
  pageCount: number;
  requiredPageCount: number;
  snapshotId?: string | null;
  expectedSnapshotId?: string;
  containsApplicationUi: boolean;
};

export function isCompletePortfolioPrintTarget(state: PortfolioPrintTargetState) {
  return state.targetKind === "portfolio" &&
    state.ready &&
    state.requiredPageCount > 0 &&
    state.pageCount === state.requiredPageCount &&
    (!state.expectedSnapshotId || state.snapshotId === state.expectedSnapshotId) &&
    !state.containsApplicationUi;
}
