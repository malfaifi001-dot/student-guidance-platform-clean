import "server-only";

import { createHash } from "node:crypto";

/**
 * Derives a stable opaque identifier without exposing the internal user id.
 * If the server-only salt is missing, analytics identity is disabled safely.
 */
export function getAnalyticsUserId(userId: string): string | null {
  const salt = process.env.ANALYTICS_USER_ID_SALT?.trim();
  if (!salt || !userId) {
    return null;
  }

  const digest = createHash("sha256")
    .update(`${salt}:${userId}`, "utf8")
    .digest("hex");

  return `usr_${digest}`;
}
