import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

export const runtime = "nodejs";

type CreateRuleBody = {
  title?: string;
  sourceType?: string;
  interventionType?: string;
  targetServiceId?: string;
  targetWorkflowId?: string | null;
  isDefault?: boolean;
  conditionJson?: unknown;
  fieldMappingJson?: unknown;
};

async function readBody(request: Request): Promise<CreateRuleBody> {
  try {
    return (await request.json()) as CreateRuleBody;
  } catch {
    return {};
  }
}

export async function GET() {
  const auth = await requireSchoolDashboardApiContext();

  if (auth instanceof Response) {
    return auth;
  }

  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return serviceGuard;

  const rules = await prisma.assessmentInterventionRule.findMany({
    where: {
      schoolAccountId: auth.schoolAccountId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    success: true,
    rules,
  });
}

export async function POST(request: Request) {
  const auth = await requireSchoolDashboardApiContext();

  if (auth instanceof Response) {
    return auth;
  }

  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return serviceGuard;

  const body = await readBody(request);

  if (!body.targetServiceId) {
    return NextResponse.json(
      {
        success: false,
        error: "الخدمة المستهدفة مطلوبة.",
      },
      { status: 400 }
    );
  }

  const service = await prisma.service.findFirst({
    where: {
      id: body.targetServiceId,
      status: "ACTIVE",
    },
  });

  if (!service) {
    return NextResponse.json(
      {
        success: false,
        error: "الخدمة المحددة غير موجودة أو غير مفعلة.",
      },
      { status: 404 }
    );
  }

  if (body.targetWorkflowId) {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: body.targetWorkflowId,
        serviceId: service.id,
        isActive: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        {
          success: false,
          error: "الـ Workflow المحدد غير موجود أو لا يتبع هذه الخدمة.",
        },
        { status: 404 }
      );
    }
  }

  const rule = await prisma.assessmentInterventionRule.create({
    data: {
      schoolAccountId: auth.schoolAccountId,
      title: body.title?.trim() || "قاعدة تدخل من مركز التحليل",
      sourceType: body.sourceType || "ASSESSMENT_RISK_STUDENT",
      interventionType: body.interventionType || "ACADEMIC_RISK",
      targetServiceId: body.targetServiceId,
      targetWorkflowId: body.targetWorkflowId || null,
      isDefault: Boolean(body.isDefault),
      ...(body.conditionJson === undefined
        ? {}
        : { conditionJson: body.conditionJson as Prisma.InputJsonValue }),
      ...(body.fieldMappingJson === undefined
        ? {}
        : { fieldMappingJson: body.fieldMappingJson as Prisma.InputJsonValue }),
      createdByUserId: (auth as any).userId || null,
    },
  });

  await prisma.platformActivityLog
    .create({
      data: {
        schoolAccountId: auth.schoolAccountId,
        actorUserId: (auth as any).userId || null,
        category: "ASSESSMENT_CENTER",
        action: "CREATE_INTERVENTION_RULE",
        severity: "INFO",
        title: "إنشاء قاعدة تدخل ذكي",
        details: {
          ruleId: rule.id,
          title: rule.title,
          targetServiceId: rule.targetServiceId,
          targetWorkflowId: rule.targetWorkflowId,
        },
      },
    })
    .catch(() => null);

  return NextResponse.json({
    success: true,
    rule,
  });
}