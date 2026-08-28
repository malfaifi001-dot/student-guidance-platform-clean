import { NextResponse } from "next/server";

type Props = { params: Promise<{ reportId: string }> };

export async function GET(request: Request, context: Props) {
  const { reportId } = await context.params;
  const origin = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? "https://teachix.sa" : new URL(request.url).origin);
  return NextResponse.redirect(new URL(`/api/dashboard/reports/${reportId}`, origin));
}
