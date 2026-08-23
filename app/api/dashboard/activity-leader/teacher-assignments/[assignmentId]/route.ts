import { NextResponse } from "next/server";

import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

type RouteContext = {
  params: Promise<{
    assignmentId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (authResult.user.role !== "ACTIVITY_LEADER" && authResult.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "هذه العملية مخصصة لرائد النشاط." },
      { status: 403 },
    );
  }

  const guard = await requireServiceAccessApi("activity-programs");
  if (guard) return guard;

  const { assignmentId } = await context.params;
  const assignment = await prisma.activityAssignment.findFirst({
    where: {
      id: assignmentId,
      schoolAccountId: authResult.schoolAccountId,
    },
    select: {
      id: true,
      status: true,
      caseEntryId: true,
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { success: false, error: "التكليف غير موجود." },
      { status: 404 },
    );
  }

  if (assignment.caseEntryId || assignment.status === "APPROVED") {
    return NextResponse.json(
      { success: false, error: "لا يمكن حذف تكليف معتمد أو مرتبط بحالة رسمية." },
      { status: 409 },
    );
  }

  const deleted = await prisma.activityAssignment.deleteMany({
    where: {
      id: assignment.id,
      schoolAccountId: authResult.schoolAccountId,
      caseEntryId: null,
      status: { not: "APPROVED" },
    },
  });

  if (deleted.count !== 1) {
    return NextResponse.json(
      { success: false, error: "تعذر حذف التكليف لأنه تغير أو تم اعتماده." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "تم حذف التكليف بنجاح.",
  });
}
