import { NextResponse } from "next/server";

import { requirePrincipalEvaluationAccreditationApi } from "@/lib/principal/evaluation-accreditation-api";
import { createPrincipalInternalAssignment } from "@/lib/principal/performance-service";

type RouteContext = { params: Promise<{ serviceSlug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { serviceSlug } = await context.params;
  const access = await requirePrincipalEvaluationAccreditationApi(serviceSlug);
  if (!access.ok) return access.response;

  try {
    const body = await request.json().catch(() => null);
    const assigneeId = String(body?.assigneeId || "").trim();
    if (!assigneeId) {
      return NextResponse.json(
        { success: false, error: "اختر أحد منسوبي المدرسة." },
        { status: 400 },
      );
    }

    const assignment = await createPrincipalInternalAssignment({
      serviceId: access.service.id,
      schoolAccountId: access.principal.schoolAccountId as string,
      createdById: access.principal.user.id,
      assigneeId,
      title: body?.title,
      note: body?.note,
      dueDate: body?.dueDate,
    });

    return NextResponse.json({
      success: true,
      assignmentId: assignment.id,
      message: "تم إرسال التكليف داخل Teachix.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "تعذر إرسال التكليف.",
      },
      { status: 400 },
    );
  }
}
