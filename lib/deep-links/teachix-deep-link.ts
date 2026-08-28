export const TEACHIX_DEEP_LINK_ORIGIN = "https://teachix.sa";

const TECHNICAL_ROUTE_PREFIXES = [
  "/api",
  "/portfolio-export-preview/",
  "/report-2-export-preview/",
  "/pdf-preview/",
  "/print/",
];

const PUBLIC_TOKEN_ROUTE_PREFIXES = [
  "/survey/",
  "/school-signature/",
  "/teacher/activity-assignment/",
  "/report-signature/",
  "/activity-plan/",
  "/activity-team-signature/",
];

export type TeachixDeepLinkRouteKind =
  | "DASHBOARD_APP_ROUTE"
  | "PUBLIC_TOKEN_ROUTE"
  | "PUBLIC_PAGE"
  | "TECHNICAL_DENIED_ROUTE"
  | "INVALID_ROUTE";

export type TeachixDeepLinkResolution = {
  accepted: boolean;
  normalizedRoute: string | null;
  pathname: string | null;
  search: string;
  routeKind: TeachixDeepLinkRouteKind;
  rejectionReason: string | null;
};

function routeKind(pathname: string): TeachixDeepLinkRouteKind {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return "INVALID_ROUTE";

  if (TECHNICAL_ROUTE_PREFIXES.some((prefix) => {
    if (prefix === "/api") return pathname === "/api" || pathname.startsWith("/api/");
    return pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix);
  })) {
    return "TECHNICAL_DENIED_ROUTE";
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "DASHBOARD_APP_ROUTE";
  }

  if (PUBLIC_TOKEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return "PUBLIC_TOKEN_ROUTE";
  }

  return "PUBLIC_PAGE";
}

export function resolveTeachixDeepLink(value: unknown): TeachixDeepLinkResolution {
  const invalid = (reason: string): TeachixDeepLinkResolution => ({
    accepted: false,
    normalizedRoute: null,
    pathname: null,
    search: "",
    routeKind: "INVALID_ROUTE",
    rejectionReason: reason,
  });

  if (typeof value !== "string" || !value.trim()) return invalid("MISSING_URL");

  const raw = value.trim();
  if (raw.startsWith("//") || raw.startsWith("javascript:") || raw.startsWith("data:")) {
    return invalid("UNSAFE_SCHEME_OR_ORIGIN");
  }

  let url: URL;
  try {
    url = new URL(raw, TEACHIX_DEEP_LINK_ORIGIN);
  } catch {
    return invalid("INVALID_URL");
  }

  if (url.origin !== TEACHIX_DEEP_LINK_ORIGIN || url.protocol !== "https:") {
    return invalid("EXTERNAL_ORIGIN");
  }

  const kind = routeKind(url.pathname);
  if (kind === "INVALID_ROUTE") return invalid("INVALID_ROUTE");
  if (kind === "TECHNICAL_DENIED_ROUTE") {
    return {
      accepted: false,
      normalizedRoute: null,
      pathname: url.pathname,
      search: url.search,
      routeKind: kind,
      rejectionReason: "TECHNICAL_ROUTE_DENIED",
    };
  }

  return {
    accepted: true,
    normalizedRoute: `${url.pathname}${url.search}`,
    pathname: url.pathname,
    search: url.search,
    routeKind: kind,
    rejectionReason: null,
  };
}

export function getSafeTeachixRoute(value: unknown): string | null {
  const resolved = resolveTeachixDeepLink(value);
  return resolved.accepted ? resolved.normalizedRoute : null;
}

export function getSafeTeachixDashboardRoute(value: unknown): string | null {
  const resolved = resolveTeachixDeepLink(value);
  return resolved.accepted && resolved.routeKind === "DASHBOARD_APP_ROUTE"
    ? resolved.normalizedRoute
    : null;
}

export function getTeachixDeepLinkRejectionReason(value: unknown): string {
  return resolveTeachixDeepLink(value).rejectionReason || "INVALID_ROUTE";
}
