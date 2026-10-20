export function isPortfolioAuthenticatedPrintEntryUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.pathname.startsWith("/api/dashboard/portfolio/snapshots/") &&
      parsed.pathname.endsWith("/print")
    );
  } catch {
    return false;
  }
}
