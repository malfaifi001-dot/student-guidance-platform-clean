export type PushErrorCategory =
  | "TOKEN_INVALID"
  | "TOKEN_UNREGISTERED"
  | "APNS_AUTH"
  | "APNS_ENVIRONMENT"
  | "APNS_TOPIC"
  | "INVALID_ARGUMENT"
  | "QUOTA"
  | "RATE_LIMIT"
  | "SERVER_UNAVAILABLE"
  | "NETWORK"
  | "INTERNAL"
  | "UNKNOWN";

export type NormalizedPushError = {
  category: PushErrorCategory;
  code: string;
  safeMessage: string;
  retryable: boolean;
  invalidToken: boolean;
};

const SAFE_CODE = /^[a-z0-9._/-]{1,120}$/i;

export function normalizePushError(errorCode?: string | null, rawMessage?: string | null): NormalizedPushError {
  const code = typeof errorCode === "string" && SAFE_CODE.test(errorCode) ? errorCode : "messaging/unknown-error";
  const searchable = `${code} ${typeof rawMessage === "string" ? rawMessage : ""}`.toLowerCase();
  const invalidToken = searchable.includes("registration-token-not-registered") || searchable.includes("unregistered");
  const invalidFormat = searchable.includes("invalid-registration-token") || searchable.includes("invalid token");
  let category: PushErrorCategory = "UNKNOWN";
  let retryable = false;

  if (invalidToken) category = "TOKEN_UNREGISTERED";
  else if (invalidFormat) category = "TOKEN_INVALID";
  else if (searchable.includes("third-party-auth") || searchable.includes("apns-auth") || searchable.includes("apns credential")) category = "APNS_AUTH";
  else if (searchable.includes("apns") && searchable.includes("environment")) category = "APNS_ENVIRONMENT";
  else if (searchable.includes("apns") && searchable.includes("topic")) category = "APNS_TOPIC";
  else if (searchable.includes("invalid-argument")) category = "INVALID_ARGUMENT";
  else if (searchable.includes("quota")) { category = "QUOTA"; retryable = true; }
  else if (searchable.includes("rate-exceeded") || searchable.includes("rate limit")) { category = "RATE_LIMIT"; retryable = true; }
  else if (searchable.includes("server-unavailable") || searchable.includes("unavailable")) { category = "SERVER_UNAVAILABLE"; retryable = true; }
  else if (searchable.includes("network") || searchable.includes("timeout")) { category = "NETWORK"; retryable = true; }
  else if (searchable.includes("internal")) { category = "INTERNAL"; retryable = true; }

  return {
    category,
    code,
    safeMessage: `Firebase Messaging rejected the delivery (${category}).`,
    retryable,
    invalidToken: invalidToken || invalidFormat,
  };
}
