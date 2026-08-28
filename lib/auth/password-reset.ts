import crypto from "node:crypto";

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildPasswordResetUrl(request: Request, token: string) {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "");
  const requestOrigin = new URL(request.url).origin;
  const origin = process.env.NODE_ENV === "production"
    ? (configured && !/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(configured)
      ? configured
      : "https://teachix.sa")
    : configured || requestOrigin;
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function deliverPasswordResetLink(input: {
  email: string;
  resetUrl: string;
}) {
  const webhookUrl = process.env.PASSWORD_RESET_WEBHOOK_URL?.trim();
  if (!webhookUrl) return false;

  const headers: Record<string, string> = { "content-type": "application/json" };
  const secret = process.env.PASSWORD_RESET_WEBHOOK_SECRET?.trim();
  if (secret) headers.authorization = `Bearer ${secret}`;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "teachix-password-reset",
      email: input.email,
      resetUrl: input.resetUrl,
    }),
    cache: "no-store",
  });
  return response.ok;
}
