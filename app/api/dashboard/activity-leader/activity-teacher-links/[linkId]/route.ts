import { NextResponse } from "next/server";

import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

type RouteContext = {
  params: Promise<{
    linkId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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

  const { linkId } = await context.params;
  const body = await request.json().catch(() => null);
  const action = String(body?.action || "").trim();

  const link = await prisma.teacherActivityLink.findFirst({
    where: {
      id: linkId,
      schoolAccountId: authResult.schoolAccountId,
    },
  });

  if (!link) {
    return NextResponse.json(
      { success: false, error: "الرابط غير موجود." },
      { status: 404 },
    );
  }

  if (action === "CLOSE") {
    await prisma.teacherActivityLink.update({
      where: { id: link.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "تم إغلاق الرابط. لن يتمكن المعلمون من إرسال جديد عبره.",
    });
  }

  if (action === "REACTIVATE") {
    await prisma.teacherActivityLink.update({
      where: { id: link.id },
      data: { status: "ACTIVE", closedAt: null },
    });

    return NextResponse.json({
      success: true,
      message: "تم إعادة فتح الرابط.",
    });
  }

  return NextResponse.json(
    { success: false, error: "الإجراء غير صحيح." },
    { status: 400 },
  );
}

export async function DELETE(request: Request, context: RouteContext) {
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

  const { linkId } = await context.params;

  const link = await prisma.teacherActivityLink.findFirst({
    where: {
      id: linkId,
      schoolAccountId: authResult.schoolAccountId,
    },
    include: {
      submissions: {
        where: {
          caseEntryId: { not: null },
        },
        select: { id: true },
      },
    },
  });

  if (!link) {
    return NextResponse.json(
      { success: false, error: "الرابط غير موجود." },
      { status: 404 },
    );
  }

  if (link.submissions.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "لا يمكن حذف رابط يوجد به أنشطة معتمدة مرتبطة بمركز الأنشطة.",
      },
      { status: 409 },
    );
  }

  await prisma.teacherActivityLink.delete({
    where: { id: link.id },
  });

  return NextResponse.json({
    success: true,
    message: "تم حذف الرابط.",
  });
}
