import { NextResponse } from "next/server";
import { saveRuntimeCase } from "@/engine/cases/case-runtime-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await saveRuntimeCase({
      workflowId: body.workflowId,
      serviceId: body.serviceId,
      title: body.title,
      studentId: body.studentId,
      values: body.values || {},
      status: "SUBMITTED",
    });

    return NextResponse.json({
      message: "تم إرسال الحالة بنجاح.",
      caseId: result.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إرسال الحالة.",
      },
      { status: 400 }
    );
  }
}