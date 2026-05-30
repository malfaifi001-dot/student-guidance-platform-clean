import { NextResponse } from "next/server";
import { updateRuntimeCase, getCaseById } from "@/engine/cases/case-runtime-engine";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { caseId } = await context.params;
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
            : "حدث خطأ أثناء جلب الحالة.",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { caseId } = await context.params;
    const body = await request.json();

    const result = await updateRuntimeCase({
      caseId,
      title: body.title,
      studentId: body.studentId,
      values: body.values || {},
      evidenceItems: Array.isArray(body.evidenceItems)
        ? body.evidenceItems
        : [],
      status: body.status,
    });

    return NextResponse.json({
      message: "تم تحديث الحالة بنجاح.",
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