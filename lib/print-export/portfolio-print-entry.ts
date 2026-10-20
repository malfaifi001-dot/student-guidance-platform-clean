export function buildPortfolioSnapshotPrintUrl(snapshotId: string) {
  return `/api/dashboard/portfolio/snapshots/${encodeURIComponent(snapshotId)}/print`;
}

export function buildPortfolioPrintRedirectPath(token: string) {
  return `/portfolio-export-preview/${encodeURIComponent(token)}?print=1`;
}
