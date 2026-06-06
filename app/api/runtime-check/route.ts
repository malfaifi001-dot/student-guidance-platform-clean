import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDatabaseInfo() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    return {
      configured: false,
      protocol: null,
      host: null,
      database: null,
      username: null,
      passwordLength: 0,
    };
  }

  try {
    const url = new URL(value);

    return {
      configured: true,
      protocol: url.protocol,
      host: url.hostname,
      port: url.port || null,
      database: url.pathname.replace(/^\//, ""),
      username: url.username,
      passwordLength: decodeURIComponent(url.password || "").length,
    };
  } catch {
    return {
      configured: true,
      invalid: true,
    };
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/runtime-check",
    nodeEnv: process.env.NODE_ENV || "unknown",
    database: getDatabaseInfo(),
    authSecretConfigured: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
    timestamp: new Date().toISOString(),
  });
}