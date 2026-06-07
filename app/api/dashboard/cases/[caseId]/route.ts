import { NextResponse } from "next/server";
import {
  updateRuntimeCase,
  getCaseById,
} from "@/engine/cases/case-runtime-engine";
import { logCaseSavedEvent } from "@/lib/admin/activity-events";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";

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

    const result = await updateRuntimeCase({
      caseId,
      schoolAccountId: authResult.schoolAccountId,
      isAdmin: authResult.isAdmin,
      title: body.title,
      studentId: body.studentId,
      values: body.values || {},
      evidenceItems: Array.isArray(body.evidenceItems)
        ? body.evidenceItems
        : [],
      status: body.status,
    });

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
      message: "تم تحديث الحالة بنجاح.",
      caseId: result.id,
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
