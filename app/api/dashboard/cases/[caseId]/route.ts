import { NextResponse, type NextRequest } from "next/server";
import {
  getCaseById,
  updateRuntimeCase,
} from "@/engine/cases/case-runtime-engine";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { caseId } = await context.params;

  try {
    const caseEntry = await getCaseById(caseId);

    return NextResponse.json({
      caseEntry,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "الحالة غير موجودة.",
      },
      { status: 404 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { caseId } = await context.params;

  try {
    const body = await request.json();

    const result = await updateRuntimeCase({
      caseId,
      title: body.title,
      studentId: body.studentId,
      values: body.values || {},
      status: body.status || "DRAFT",
    });

    return NextResponse.json({
      message:
        body.status === "SUBMITTED"
          ? "تم إرسال الحالة بنجاح."
          : "تم تحديث المسودة بنجاح.",
      caseId: result.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تحديث الحالة.",
      },
      { status: 400 }
    );
  }
}