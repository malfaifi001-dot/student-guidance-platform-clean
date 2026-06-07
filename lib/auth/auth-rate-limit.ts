import "server-only";

import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";

type RateLimitOptions = {
  namespace: string;
  identity?: string | null;
  limit: number;
  windowMs: number;
};

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown-ip"
  );
}

function normalizeIdentity(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._+\-\u0600-\u06FF]/gi, "")
    .slice(0, 120);
}

export function getRateLimitKey(request: Request, options: RateLimitOptions) {
  const ip = getClientIp(request);
  const identity = normalizeIdentity(options.identity);

  return [
    options.namespace,
    `ip:${ip}`,
    identity ? `id:${identity}` : "id:anonymous",
  ].join(":");
}

export function enforceRateLimit(request: Request, options: RateLimitOptions) {
  const key = getRateLimitKey(request, options);
  const allowed = checkRateLimit(key, options.limit, options.windowMs);

  if (allowed) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      error: "تم تجاوز عدد المحاولات المسموح. حاول مرة أخرى بعد قليل.",
      code: "RATE_LIMITED",
    },
    { status: 429 }
  );
}
