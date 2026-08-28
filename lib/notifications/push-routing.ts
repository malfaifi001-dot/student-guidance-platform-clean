import { resolveTeachixDeepLink } from "@/lib/deep-links/teachix-deep-link";

export function getSafePushRoute(value: unknown): string | null {
  const resolved = resolveTeachixDeepLink(value);
  return resolved.accepted && resolved.routeKind === "DASHBOARD_APP_ROUTE"
    ? resolved.normalizedRoute
    : null;
}
