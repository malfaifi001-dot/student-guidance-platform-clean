import crypto from "node:crypto";

const DEFAULT_ACCOUNTABILITY_TOKEN_TTL_DAYS = 30;

export function generateAccountabilityToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function getAccountabilityTokenExpiry(
  now = new Date(),
  ttlDays = DEFAULT_ACCOUNTABILITY_TOKEN_TTL_DAYS,
) {
  const safeTtlDays = Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : DEFAULT_ACCOUNTABILITY_TOKEN_TTL_DAYS;
  const expiry = new Date(now);
  expiry.setUTCDate(expiry.getUTCDate() + safeTtlDays);
  return expiry;
}

export function isAccountabilityTokenExpired(
  expiresAt: Date | string | null | undefined,
  now = new Date(),
) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= now.getTime());
}

export function isValidAccountabilityToken(value: unknown) {
  const token = typeof value === "string" ? value.trim() : "";
  return token.length >= 32 && token.length <= 255 && /^[A-Za-z0-9_-]+$/.test(token);
}
