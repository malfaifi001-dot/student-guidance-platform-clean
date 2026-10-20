export function buildPortfolioSnapshotPrintUrl(snapshotId: string) {
  return `/api/dashboard/portfolio/snapshots/${encodeURIComponent(snapshotId)}/print`;
}
