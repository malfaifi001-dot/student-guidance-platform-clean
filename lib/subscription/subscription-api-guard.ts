import {
  requireActiveSubscriptionForCurrentUser,
  requireServiceAccessForCurrentUser,
} from "@/bin/require-auth";

export async function requireActiveSubscriptionApi(
  options: { allowPrincipal?: boolean } = {},
) {
  const result = await requireActiveSubscriptionForCurrentUser(options);
  return result instanceof Response ? result : null;
}

export async function requireServiceAccessApi(
  serviceSlug: string,
  options: { allowPrincipal?: boolean } = {},
) {
  const result = await requireServiceAccessForCurrentUser(serviceSlug, options);
  return result instanceof Response ? result : null;
}
