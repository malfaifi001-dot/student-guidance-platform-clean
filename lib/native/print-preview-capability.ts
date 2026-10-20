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

export function isValidPortfolioPrintPreviewUrl(
  value: string,
  expectedOrigin: string,
): boolean {
  try {
    const parsed = new URL(value);
    const pathPrefix = "/portfolio-export-preview/";
    const tokenPart = parsed.pathname.startsWith(pathPrefix)
      ? parsed.pathname.slice(pathPrefix.length)
      : "";

    if (
      parsed.origin !== expectedOrigin ||
      !tokenPart ||
      tokenPart.includes("/") ||
      parsed.searchParams.get("print") !== "1"
    ) {
      return false;
    }

    decodeURIComponent(tokenPart);
    return true;
  } catch {
    return false;
  }
}

export async function resolvePortfolioPrintPreviewUrl(
  entryUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const entry = new URL(entryUrl);
  const response = await fetchImpl(entryUrl, {
    cache: "no-store",
    credentials: "include",
    redirect: "follow",
  });

  if (!response.ok || !response.url) {
    throw new Error("PORTFOLIO_PRINT_AUTH_HANDOFF_FAILED");
  }

  const finalUrl = new URL(response.url, entryUrl).toString();
  if (!isValidPortfolioPrintPreviewUrl(finalUrl, entry.origin)) {
    throw new Error("PORTFOLIO_PRINT_PREVIEW_URL_INVALID");
  }

  return finalUrl;
}
