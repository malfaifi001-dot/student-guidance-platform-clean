import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? "https://teachix.sa" : new URL(request.url).origin);
  return NextResponse.redirect(new URL("/api/dashboard/reports", origin));
}

export async function POST(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? "https://teachix.sa" : new URL(request.url).origin);
  return NextResponse.redirect(new URL("/api/dashboard/reports", origin));
}
