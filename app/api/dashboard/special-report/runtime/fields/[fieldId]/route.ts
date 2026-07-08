import { NextResponse } from "next/server";

import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import {
  SPECIAL_REPORT_FIXED_FIELD_KEYS,
} from "@/lib/special-report/catalog";
import { SPECIAL_REPORT_SERVICE_SLUG } from "@/lib/special-report/types";

const SPECIAL_REPORT_RUNTIME_LINK_SOURCE_TYPE = "SPECIAL_REPORT_RUNTIME_WORKFLOW";
const SPECIAL_REPORT_RUNTIME_LINK_TARGET_TYPE = "WORKFLOW_OWNER_SCHOOL";

type RouteContext = {
  params: Promise<{
    fieldId: string;
  }>;
};

type UpdateFieldBody = {
  label?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const { fieldId } = await context.params;
    const body = (await request.json()) as UpdateFieldBody;
    const label = String(body.label ?? "").trim();

    if (!fieldId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "معرّف الحقل مطلوب.",
        },
        { status: 400 }
      );
    }

    if (label.length < 1 || label.length > 120) {
      return NextResponse.json(
        {
          success: false,
          error: "عنوان الحقل يجب أن يكون بين 1 و120 حرفًا.",
        },
        { status: 400 }
      );
    }

    const field = await prisma.dynamicField.findFirst({
      where: {
        id: fieldId,
        step: {
          workflow: {
            service: {
              slug: SPECIAL_REPORT_SERVICE_SLUG,
            },
          },
        },
      },
      select: {
        id: true,
        key: true,
        step: {
          select: {
            workflow: {
              select: {
                id: true,
                isActive: true,
                status: true,
                workflowType: true,
                cases: {
                  select: {
                    schoolAccountId: true,
                  },
                  take: 10,
                },
                service: {
                  select: {
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!field) {
      return NextResponse.json(
        {
          success: false,
          error: "الحقل غير موجود أو لا يتبع خدمة التقرير الخاص.",
        },
        { status: 404 }
      );
    }

    if (
      SPECIAL_REPORT_FIXED_FIELD_KEYS.includes(
        field.key as (typeof SPECIAL_REPORT_FIXED_FIELD_KEYS)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن تعديل عنوان هذا الحقل.",
        },
        { status: 403 }
      );
    }

    const workflow = field.step.workflow;

    if (workflow.service.slug !== SPECIAL_REPORT_SERVICE_SLUG) {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن تعديل حقل من خدمة أخرى.",
        },
        { status: 403 }
      );
    }

    if (!authResult.isAdmin) {
      if (!authResult.schoolAccountId) {
        return NextResponse.json(
          {
            success: false,
            error: "لم يتم ربط الحساب بمدرسة.",
          },
          { status: 403 }
        );
      }

      const linkedCaseSchoolIds = workflow.cases
        .map((item) => item.schoolAccountId)
        .filter(Boolean);

      const schoolLink = await prisma.dashboardResourceLink.findFirst({
        where: {
          schoolAccountId: authResult.schoolAccountId,
          sourceType: SPECIAL_REPORT_RUNTIME_LINK_SOURCE_TYPE,
          sourceId: workflow.id,
          targetType: SPECIAL_REPORT_RUNTIME_LINK_TARGET_TYPE,
          targetId: authResult.schoolAccountId,
        },
        select: {
          id: true,
        },
      });

      if (
        linkedCaseSchoolIds.length > 0 &&
        linkedCaseSchoolIds.some(
          (schoolAccountId) =>
            schoolAccountId !== authResult.schoolAccountId
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "لا تملك صلاحية تعديل هذا الحقل.",
          },
          { status: 404 }
        );
      }

      if (linkedCaseSchoolIds.length === 0 && !schoolLink) {
        return NextResponse.json(
          {
            success: false,
            error: "لا تملك صلاحية تعديل هذا الحقل.",
          },
          { status: 404 }
        );
      }
    }

    const updatedField = await prisma.dynamicField.update({
      where: {
        id: field.id,
      },
      data: {
        label,
      },
      select: {
        id: true,
        key: true,
        label: true,
      },
    });

    return NextResponse.json({
      success: true,
      field: updatedField,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "تعذر تحديث عنوان الحقل.",
      },
      { status: 400 }
    );
  }
}
