const DENIED_PREFIXES = [
  "/api",
  "/portfolio-export-preview/",
  "/report-2-export-preview/",
  "/pdf-preview/",
  "/print/",
];

export function getSafePushRoute(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value, "https://teachix.sa");
    if (url.origin !== "https://teachix.sa") return null;
    if (!url.pathname.startsWith("/dashboard")) return null;
    if (DENIED_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix))) {
      return null;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
