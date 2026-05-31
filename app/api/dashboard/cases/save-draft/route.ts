import { NextResponse } from "next/server";
import { saveRuntimeCase } from "@/engine/cases/case-runtime-engine";
import { logCaseSavedEvent } from "@/lib/admin/activity-events";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await saveRuntimeCase({
      workflowId: body.workflowId,
      serviceId: body.serviceId,
      title: body.title,
      studentId: body.studentId,
      values: body.values || {},
      evidenceItems: Array.isArray(body.evidenceItems)
        ? body.evidenceItems
        : [],
      status: "DRAFT",
    });

    
    // audit-log:case-draft-saved
    await logCaseSavedEvent({
      caseId: result.id,
      status: "DRAFT",
      title: body.title || null,
      workflowId: body.workflowId || null,
      serviceId: body.serviceId || null,
      studentId: body.studentId || null,
      valueCount:
        body.values && typeof body.values === "object"
          ? Object.keys(body.values).length
          : 0,
      evidenceCount: Array.isArray(body.evidenceItems)
        ? body.evidenceItems.length
        : 0,
    });

return NextResponse.json({
      message: "تم حفظ المسودة بنجاح.",
      caseId: result.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء حفظ المسودة.",
      },
      { status: 400 }
    );
  }
}