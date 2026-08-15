import { NextResponse } from "next/server";

import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import {
  getInternalAssignmentForAssignee,
  INTERNAL_ASSIGNMENT_RECIPIENT_ROLES,
  submitInternalAssignmentReport,
} from "@/lib/assignments/internal-assignment-service";

type RouteContext = { params: Promise<{ assignmentId: string }> };

function roleAllowed(role: string) {
  return INTERNAL_ASSIGNMENT_RECIPIENT_ROLES.some((allowed) => allowed === role);
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSchoolDashboardApiContext();
  if (auth instanceof Response) return auth;
  if (!roleAllowed(auth.user.role)) {
    return NextResponse.json(
      { success: false, error: "هذه الصفحة غير متاحة لدورك." },
      { status: 403 },
    );
  }

  const { assignmentId } = await context.params;
  const result = await getInternalAssignmentForAssignee({
    context: auth,
    assignmentId,
    markOpened: true,
  });
  if (!result) {
    return NextResponse.json(
      { success: false, error: "التكليف غير موجود." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, ...result });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireSchoolDashboardApiContext();
  if (auth instanceof Response) return auth;
  if (!roleAllowed(auth.user.role)) {
    return NextResponse.json(
      { success: false, error: "هذه العملية غير متاحة لدورك." },
      { status: 403 },
    );
  }

  try {
    const { assignmentId } = await context.params;
    const body = await request.json().catch(() => null);
    const report = await submitInternalAssignmentReport({
      context: auth,
      assignmentId,
      sourceType: body?.sourceType,
      sourceId: body?.sourceId,
    });
    return NextResponse.json({
      success: true,
      report,
      message: "تم إرسال التقرير إلى عنصر التقييم لدى مدير المدرسة.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "تعذر إرسال التقرير.",
      },
      { status: 400 },
    );
  }
}
