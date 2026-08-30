import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveRuntimeCase } from "@/engine/cases/case-runtime-engine";
import { logCaseSavedEvent } from "@/lib/admin/activity-events";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getActivityProgramsBillingServiceSlug } from "@/lib/activity-programs/activity-program-catalog";
import {
  canUseStudentActivityCompetitionsService,
  isStudentActivityCompetitionsServiceSlug,
} from "@/lib/activity-competitions/activity-competitions-service";

export async function POST(request: Request) {
  const authResult = await requireSchoolDashboardApiContext({ allowPrincipal: true });

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const body = await request.json();

    const serviceId = String(body?.serviceId || "").trim();

    if (!serviceId) {
      return NextResponse.json(
        {
          success: false,
          error: "serviceId مطلوب لحفظ الحالة.",
        },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: "الخدمة غير موجودة.",
        },
        { status: 404 }
      );
    }

    const serviceGuard = await requireServiceAccessApi(
      getActivityProgramsBillingServiceSlug(service.slug),
      { allowPrincipal: true },
    );
    if (serviceGuard) return serviceGuard;

    if (
      isStudentActivityCompetitionsServiceSlug(service.slug) &&
      !canUseStudentActivityCompetitionsService(authResult.user.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "هذه الخدمة متاحة لرائد النشاط فقط.",
        },
        { status: 403 },
      );
    }

    if (
      service.slug === "guardian-summons" &&
      authResult.user.role !== "ADMIN" &&
      authResult.user.role !== "COUNSELOR"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "هذه الخدمة متاحة للموجه الطلابي فقط حالياً.",
        },
        { status: 403 },
      );
    }

    const result = await saveRuntimeCase({
      schoolAccountId: authResult.schoolAccountId,
      createdById: authResult.user.id,
      workflowId: body.workflowId,
      serviceId,
      title: body.title,
      studentId: body.studentId,
      values: body.values || {},
      evidenceItems: Array.isArray(body.evidenceItems)
        ? body.evidenceItems
        : [],
      status: "DRAFT",
    });

    await logCaseSavedEvent({
      caseId: result.id,
      status: "DRAFT",
      title: body.title || null,
      workflowId: body.workflowId || null,
      serviceId,
      serviceSlug: service.slug,
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
      success: true,
      message: "تم حفظ المسودة بنجاح.",
      caseId: result.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء حفظ المسودة.",
      },
      { status: 400 }
    );
  }
}
