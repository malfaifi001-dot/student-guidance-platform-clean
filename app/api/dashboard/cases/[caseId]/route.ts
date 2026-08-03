import { NextResponse } from "next/server";
import {
  updateRuntimeCase,
  getCaseById,
} from "@/engine/cases/case-runtime-engine";
import { logCaseSavedEvent } from "@/lib/admin/activity-events";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import {
  buildCaseEntryWhereForUser,
} from "@/lib/cases/case-access-scope";
import { resolveCaseCapabilities } from "@/lib/cases/case-permissions";
import { deleteEvidenceFiles } from "@/lib/evidence/delete-evidence-files";
import { prisma } from "@/lib/prisma";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getActivityProgramsBillingServiceSlug } from "@/lib/activity-programs/activity-program-catalog";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { syncReportTwoFromCase } from "@/lib/report-2/sync-report-two-from-case";

function comparable(value: unknown) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return String(value ?? "");
  }
}

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (!authResult.isAdmin && !authResult.schoolAccountId) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم ربط الحساب بمدرسة.",
        code: "SCHOOL_ACCOUNT_REQUIRED",
      },
      { status: 403 }
    );
  }

  try {
    const { caseId } = await context.params;

    const caseEntry = await getCaseById(caseId, {
      schoolAccountId: authResult.schoolAccountId,
      isAdmin: authResult.isAdmin,
      userId: authResult.user.id,
      userRole: authResult.user.role,
      userEmail: authResult.user.email,
    });

    return NextResponse.json({
      success: true,
      caseEntry,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء جلب الحالة.",
      },
      { status: 404 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (!authResult.isAdmin && !authResult.schoolAccountId) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم ربط الحساب بمدرسة.",
        code: "SCHOOL_ACCOUNT_REQUIRED",
      },
      { status: 403 }
    );
  }

  try {
    const { caseId } = await context.params;
    const body = await request.json();

    const editableCase = await prisma.caseEntry.findFirst({
      where: {
        id: caseId,
        ...buildCaseEntryWhereForUser({
          id: authResult.user.id,
          role: authResult.user.role,
          schoolAccountId: authResult.schoolAccountId,
          email: authResult.user.email,
        }),
      },
      select: {
        id: true,
        schoolAccountId: true,
        createdById: true,
        status: true,
        service: { select: { slug: true } },
        activityAssignment: {
          select: {
            teacherEmail: true,
            status: true,
          },
        },
        values: { select: { fieldKey: true, value: true, jsonValue: true } },
      },
    });

    if (!editableCase) {
      return NextResponse.json(
        {
          success: false,
          code: "CASE_NOT_FOUND",
          error: "الحالة غير موجودة أو لا تملك صلاحية تعديلها.",
        },
        { status: 404 },
      );
    }

    if (
      !resolveCaseCapabilities(
        {
          id: authResult.user.id,
          role: authResult.user.role,
          schoolAccountId: authResult.schoolAccountId,
          email: authResult.user.email,
        },
        editableCase,
      ).canEditCase
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "CASE_EDIT_FORBIDDEN",
          error: "لا تملك صلاحية تعديل هذه الحالة.",
        },
        { status: 403 },
      );
    }

    const serviceGuard = await requireServiceAccessApi(
      getActivityProgramsBillingServiceSlug(editableCase.service.slug),
    );
    if (serviceGuard) return serviceGuard;

    if (
      editableCase.service.slug === "guardian-summons" &&
      !authResult.isAdmin &&
      authResult.user.role !== "COUNSELOR"
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "ROLE_NOT_ALLOWED",
          error: "هذه الخدمة متاحة للموجه الطلابي فقط حاليًا.",
        },
        { status: 403 },
      );
    }

    const result = await updateRuntimeCase({
      caseId,
      schoolAccountId: authResult.schoolAccountId,
      isAdmin: authResult.isAdmin,
      userId: authResult.user.id,
      userRole: authResult.user.role,
      userEmail: authResult.user.email,
      title: body.title,
      studentId: body.studentId,
      values: body.values || {},
      evidenceItems: Array.isArray(body.evidenceItems)
        ? body.evidenceItems
        : [],
      status: body.status,
    });

    const previousValues = new Map(
      editableCase.values.map((item) => [
        item.fieldKey,
        item.jsonValue ?? item.value,
      ]),
    );
    const nextValues = Object.fromEntries(
      result.values.map((item) => [item.fieldKey, item.jsonValue ?? item.value]),
    ) as Record<string, unknown>;
    const changedFieldKeys = Array.from(
      new Set([...previousValues.keys(), ...Object.keys(nextValues)]),
    ).filter(
      (key) => comparable(previousValues.get(key)) !== comparable(nextValues[key]),
    );

    let reportSync;
    try {
      const current = await getCurrentSessionUser();
      if (!current) throw new Error("UNAUTHENTICATED_REPORT_SYNC");

      reportSync = await syncReportTwoFromCase({
        caseId: result.id,
        schoolAccountId: editableCase.schoolAccountId,
        actorUserId: authResult.user.id,
        current,
        changedFieldKeys,
      });
    } catch (syncError) {
      console.error("report-2 sync after case update failed", {
        caseId: result.id,
        actorUserId: authResult.user.id,
        error: syncError instanceof Error ? syncError.message : String(syncError),
      });
      await prisma.platformActivityLog.create({
        data: {
          actorUserId: authResult.user.id,
          schoolAccountId: editableCase.schoolAccountId,
          category: "REPORT",
          action: "REPORT_TWO_SYNC_FROM_CASE_FAILED",
          severity: "WARNING",
          title: "تعذر تحديث تقرير من بيانات الحالة",
          details: {
            caseEntryId: result.id,
            serviceSlug: editableCase.service.slug,
            changedWorkflowFieldKeys: changedFieldKeys,
            errorCode:
              syncError instanceof Error ? syncError.message : "UNKNOWN_SYNC_ERROR",
          },
        },
      }).catch((logError) => {
        console.error("report-2 sync failure audit failed", {
          caseId: result.id,
          error: logError instanceof Error ? logError.message : String(logError),
        });
      });
      reportSync = {
        attempted: true as const,
        updated: false as const,
        reason: "SYNC_FAILED" as const,
        message: "تم حفظ بيانات الحالة، لكن تعذر تحديث التقرير المرتبط.",
      };
    }

    await logCaseSavedEvent({
      caseId: result.id,
      status: result.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT",
      title: result.title || null,
      workflowId: result.workflowId || null,
      serviceId: result.serviceId || null,
      serviceSlug: result.service?.slug || null,
      studentId: result.studentId || null,
      valueCount: Array.isArray(result.values) ? result.values.length : 0,
      evidenceCount: Array.isArray(result.evidences)
        ? result.evidences.length
        : 0,
    });

    return NextResponse.json({
      success: true,
      message:
        reportSync.updated && "message" in reportSync
          ? reportSync.message
          : reportSync.reason === "SYNC_FAILED"
              ? reportSync.message
              : "تم حفظ بيانات الحالة.",
      caseId: result.id,
      reportSync,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تحديث الحالة.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireDashboardApiContext();

  if (authResult instanceof Response) return authResult;

  const { caseId } = await context.params;
  const permissionUser = {
    id: authResult.user.id,
    role: authResult.user.role,
    schoolAccountId: authResult.schoolAccountId,
    email: authResult.user.email,
  };

  const caseEntry = await prisma.caseEntry.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      title: true,
      schoolAccountId: true,
      service: { select: { slug: true } },
      createdById: true,
      status: true,
      activityAssignment: {
        select: {
          teacherEmail: true,
          status: true,
        },
      },
      evidences: { select: { fileUrl: true } },
      caseEvidences: { select: { fileUrl: true } },
    },
  });

  if (
    !caseEntry ||
    (authResult.user.role !== "ADMIN" &&
      caseEntry.schoolAccountId !== authResult.schoolAccountId)
  ) {
    return NextResponse.json(
      { success: false, code: "CASE_NOT_FOUND", error: "الحالة غير موجودة أو لا تملك صلاحية حذفها." },
      { status: 404 },
    );
  }

  if (!resolveCaseCapabilities(permissionUser, caseEntry).canDeleteCase) {
    return NextResponse.json(
      { success: false, code: "CASE_DELETE_FORBIDDEN", error: "لا تملك صلاحية حذف هذه الحالة." },
      { status: 403 },
    );
  }

  try {
    const deletion = await prisma.$transaction(async (tx) => {
      const current = await tx.caseEntry.findUnique({
        where: { id: caseId },
        select: {
          id: true,
          schoolAccountId: true,
          createdById: true,
          status: true,
          service: { select: { slug: true } },
          activityAssignment: {
            select: {
              teacherEmail: true,
              status: true,
            },
          },
        },
      });

      if (!current) throw new Error("CASE_ALREADY_DELETED");
      if (!resolveCaseCapabilities(permissionUser, current).canDeleteCase) {
        throw new Error("CASE_DELETE_FORBIDDEN");
      }

      const [activeReports, snapshots, guidanceReports] = await Promise.all([
        tx.reportTwoActive.findMany({ where: { caseEntryId: caseId }, select: { id: true } }),
        tx.reportSnapshot.findMany({ where: { caseEntryId: caseId }, select: { id: true } }),
        tx.guidanceReport.findMany({ where: { caseEntryId: caseId }, select: { id: true } }),
      ]);
      const reportIds = [
        ...activeReports.map((item) => item.id),
        ...snapshots.map((item) => item.id),
        ...guidanceReports.map((item) => item.id),
      ];
      const linkedResourceIds = [caseId, ...reportIds];

      await tx.dashboardResourceLink.deleteMany({
        where: {
          schoolAccountId: caseEntry.schoolAccountId,
          OR: [
            { sourceId: { in: linkedResourceIds } },
            { targetId: { in: linkedResourceIds } },
          ],
        },
      });
      await tx.reportTwoActive.deleteMany({ where: { caseEntryId: caseId } });
      await tx.reportSnapshot.deleteMany({ where: { caseEntryId: caseId } });
      await tx.caseEvidence.deleteMany({ where: { caseEntryId: caseId } });
      await tx.calendarReminder.deleteMany({ where: { caseEntryId: caseId } });
      await tx.activityAssignment.updateMany({
        where: { caseEntryId: caseId },
        data: { caseEntryId: null },
      });
      await tx.reportTemplate.updateMany({
        where: { caseEntryId: caseId },
        data: { caseEntryId: null },
      });
      await tx.caseEntry.delete({ where: { id: caseId } });

      await tx.platformActivityLog.create({
        data: {
          actorUserId: authResult.user.id,
          schoolAccountId: caseEntry.schoolAccountId,
          category: "CASE",
          action: "CASE_DELETED",
          severity: "WARNING",
          title: "تم حذف حالة",
          details: {
            caseEntryId: caseId,
            caseTitle: caseEntry.title || "حالة بدون عنوان",
            serviceSlug: caseEntry.service.slug,
            hadLinkedReports: reportIds.length > 0,
            deletedReportCount: reportIds.length,
            deletedAt: new Date().toISOString(),
          },
        },
      });

      return { deletedReportCount: reportIds.length };
    });

    const fileDeletionFailures = await deleteEvidenceFiles([
      ...caseEntry.evidences.map((item) => item.fileUrl),
      ...caseEntry.caseEvidences.map((item) => item.fileUrl),
    ]);
    if (fileDeletionFailures) {
      console.error("case evidence file cleanup failed", {
        caseId,
        failureCount: fileDeletionFailures,
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف الحالة بنجاح.",
      deletedCase: {
        id: caseEntry.id,
        title: caseEntry.title,
        serviceSlug: caseEntry.service.slug,
        deletedReportCount: deletion.deletedReportCount,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CASE_ALREADY_DELETED") {
      return NextResponse.json(
        { success: false, code: "CASE_NOT_FOUND", error: "تم حذف الحالة مسبقًا." },
        { status: 404 },
      );
    }
    if (error instanceof Error && error.message === "CASE_DELETE_FORBIDDEN") {
      return NextResponse.json(
        { success: false, code: "CASE_DELETE_FORBIDDEN", error: "لا تملك صلاحية حذف هذه الحالة." },
        { status: 403 },
      );
    }
    console.error("case deletion failed", {
      caseId,
      actorUserId: authResult.user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, code: "CASE_DELETE_FAILED", error: "تعذر حذف الحالة. حاول مرة أخرى." },
      { status: 500 },
    );
  }
}
