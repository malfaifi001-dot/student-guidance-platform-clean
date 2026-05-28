import { NextResponse, type NextRequest } from "next/server";
import { getCaseById } from "@/engine/cases/case-runtime-engine";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const { caseId } = await context.params;

  try {
    const caseEntry = await getCaseById(caseId);

    return NextResponse.json({
      caseEntry,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "الحالة غير موجودة.",
      },
      { status: 404 }
    );
  }
}