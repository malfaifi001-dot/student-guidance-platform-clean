import crypto from "crypto";

export const SESSION_COOKIE_NAME = "student_guidance_session";

type SessionPayload = {
  userId: string;
  email: string;
  role: string;
  schoolAccountId: string | null;
  sessionId: string;
  tokenId: string;
  exp: number;
};

function getSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-only-change-this-secret"
  );
}

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createTokenId() {
  return crypto.randomBytes(32).toString("hex");
}

export function getSessionExpiryDate() {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">) {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token?: string | null) {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);

  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    if (!payload.sessionId || !payload.tokenId) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}
