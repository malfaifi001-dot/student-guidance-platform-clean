import { NextResponse } from "next/server";

type Props = { params: Promise<{ reportId: string }> };

export async function POST(_request: Request, context: Props) {
  const { reportId } = await context.params;
  return NextResponse.redirect(new URL(`/api/dashboard/reports/${reportId}/export/pdf`, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
