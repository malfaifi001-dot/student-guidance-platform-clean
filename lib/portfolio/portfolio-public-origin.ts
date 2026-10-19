import "server-only";

const DEFAULT_PRODUCTION_ORIGIN = "https://teachix.sa";

function isPrivateOrLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(?:1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname.startsWith("169.254.")
  );
}

export function getPortfolioPublicOrigin() {
  const configured =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.SITE_URL?.trim();
  const raw = configured || (process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_ORIGIN : "");

  if (!raw) throw new Error("PORTFOLIO_PUBLIC_ORIGIN_NOT_CONFIGURED");

  let origin: URL;
  try {
    origin = new URL(raw);
  } catch {
    throw new Error("PORTFOLIO_PUBLIC_ORIGIN_INVALID");
  }

  const hostname = origin.hostname.toLowerCase();
  const productionHostAllowed =
    process.env.NODE_ENV !== "production" ||
    hostname === "teachix.sa" ||
    hostname === "www.teachix.sa";

  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    isPrivateOrLocalHostname(hostname) ||
    !productionHostAllowed
  ) {
    throw new Error("PORTFOLIO_PUBLIC_ORIGIN_NOT_REACHABLE");
  }

  return origin.origin;
}
