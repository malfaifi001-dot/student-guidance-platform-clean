import { NextResponse } from "next/server";

type Props = { params: Promise<{ reportId: string }> };

export async function POST(_request: Request, context: Props) {
  const { reportId } = await context.params;
  return NextResponse.redirect(
    new URL(
      `/api/dashboard/reports/${reportId}/delete`,
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    ),
  );
}

export async function DELETE(_request: Request, context: Props) {
  const { reportId } = await context.params;
  return NextResponse.redirect(
    new URL(
      `/api/dashboard/reports/${reportId}/delete`,
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    ),
    307,
  );
}
