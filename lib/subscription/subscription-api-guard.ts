import {
  requireActiveSubscriptionForCurrentUser,
  requireServiceAccessForCurrentUser,
} from "@/bin/require-auth";

export async function requireActiveSubscriptionApi() {
  const result = await requireActiveSubscriptionForCurrentUser();
  return result instanceof Response ? result : null;
}

export async function requireServiceAccessApi(serviceSlug: string) {
  const result = await requireServiceAccessForCurrentUser(serviceSlug);
  return result instanceof Response ? result : null;
}
