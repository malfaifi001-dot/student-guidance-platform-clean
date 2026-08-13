import { NextResponse } from "next/server";

import { generateWorkflowFieldSuggestion } from "@/lib/ai/workflow-field-suggestion";
import { requireServiceAccessForCurrentUser } from "@/bin/require-auth";
import { prisma } from "@/lib/prisma";
import { COUNSELOR_GUIDANCE_WORKFLOW_SERVICES } from "@/lib/constants/services";
import { ACTIVITY_PROGRAM_WORKFLOW_SERVICES, getActivityProgramsBillingServiceSlug } from "@/lib/activity-programs/activity-program-catalog";
import { TEACHER_PERFORMANCE_WORKFLOW_SERVICES } from "@/lib/teacher-performance/teacher-performance-services";
import {
  parseWorkflowFieldBehaviorConfig,
  supportsWorkflowFieldAi,
  type WorkflowAiAction,
} from "@/lib/workflows/field-behavior-config";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;
const counselorServices = new Set(COUNSELOR_GUIDANCE_WORKFLOW_SERVICES.map((service) => service.slug));
const activityServices = new Set<string>(ACTIVITY_PROGRAM_WORKFLOW_SERVICES.map((service) => service.slug));
const teacherServices = new Set([
  ...TEACHER_PERFORMANCE_WORKFLOW_SERVICES.map((service) => service.slug),
  "teacher-report-issuance",
]);

function roleCanUseWorkflowService(role: string, serviceSlug: string) {
  if (role === "ADMIN") return true;
  if (activityServices.has(serviceSlug)) return role === "ACTIVITY_LEADER";
  if (teacherServices.has(serviceSlug)) return role === "TEACHER";
  if (counselorServices.has(serviceSlug)) return role === "COUNSELOR";
  return true;
}

function plainValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => ["string", "number", "boolean"].includes(typeof item))
      .map(String)
      .join("، ")
      .trim();
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "حجم الطلب أكبر من المسموح." }, { status: 413 });
    }

    const body = await request.json().catch(() => null);
    const workflowId = String(body?.workflowId ?? "").trim();
    const fieldId = String(body?.fieldId ?? "").trim();
    const requestedAction = String(body?.action ?? "").trim() as WorkflowAiAction;

    if (!workflowId || !fieldId || !body || typeof body.values !== "object" || Array.isArray(body.values)) {
      return NextResponse.json({ error: "بيانات طلب الاقتراح غير مكتملة." }, { status: 400 });
    }
    if (JSON.stringify(body).length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "حجم الطلب أكبر من المسموح." }, { status: 413 });
    }

    const field = await prisma.dynamicField.findFirst({
      where: { id: fieldId, step: { workflowId } },
      include: {
        options: { orderBy: { order: "asc" } },
        step: {
          include: {
            workflow: { include: { service: true } },
            fields: { include: { options: true }, orderBy: { order: "asc" } },
          },
        },
      },
    });

    if (!field) return NextResponse.json({ error: "الحقل غير موجود." }, { status: 404 });

    const access = await requireServiceAccessForCurrentUser(
      getActivityProgramsBillingServiceSlug(field.step.workflow.service.slug),
    );
    if (access instanceof Response) return access;
    if (!roleCanUseWorkflowService(access.user.role, field.step.workflow.service.slug)) {
      return NextResponse.json({ error: "هذه الخدمة غير متاحة لدورك الحالي." }, { status: 403 });
    }

    const config = parseWorkflowFieldBehaviorConfig(field.behaviorConfig).ai;
    if (!config?.enabled || !supportsWorkflowFieldAi(field.type, field.isRepeater)) {
      return NextResponse.json({ error: "المساعد الذكي غير مفعل لهذا الحقل." }, { status: 403 });
    }
    if (!config.actions.includes(requestedAction)) {
      return NextResponse.json({ error: "الإجراء المطلوب غير مسموح لهذا الحقل." }, { status: 403 });
    }
    const currentText = plainValue((body.values as Record<string, unknown>)[field.key]);
    if (["IMPROVE", "REWRITE", "SUMMARIZE", "COMPLETE"].includes(requestedAction) && !currentText) {
      return NextResponse.json({ error: "اكتب نصًا في الحقل أولًا لاستخدام هذا الإجراء." }, { status: 400 });
    }

    const allSteps = await prisma.workflowStep.findMany({
      where: { workflowId },
      include: { fields: { include: { options: true }, orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    });
    const orderedFields = allSteps.flatMap((step) => step.fields.map((item) => ({ ...item, stepId: step.id })));
    const targetIndex = orderedFields.findIndex((item) => item.id === field.id);
    const allowedKeys = new Set(
      config.contextMode === "SELECTED_FIELDS"
        ? config.sourceFieldKeys
        : config.contextMode === "CURRENT_STEP"
          ? field.step.fields.map((item) => item.key)
          : orderedFields.slice(0, targetIndex).map((item) => item.key),
    );
    allowedKeys.delete(field.key);
    const sourceFields = orderedFields.filter((item) => allowedKeys.has(item.key));
    const values = body.values as Record<string, unknown>;
    const context = sourceFields.flatMap((source) => {
      let value = plainValue(values[source.key]);
      if (!value) return [];
      if (source.options.length) {
        const optionLabels = new Map(source.options.map((option) => [option.value, option.label]));
        value = value.split("، ").map((part) => optionLabels.get(part) ?? part).join("، ");
      }
      return [{ label: source.label, value }];
    });

    const suggestion = await generateWorkflowFieldSuggestion({
      action: requestedAction,
      config,
      serviceName: field.step.workflow.service.name,
      workflowName: field.step.workflow.name,
      stepTitle: field.step.title,
      targetFieldLabel: field.label,
      currentText,
      context,
      richText: field.type === "RICH_TEXT",
    });

    return NextResponse.json({ suggestion, action: requestedAction });
  } catch (error) {
    console.error("WORKFLOW_FIELD_AI_SUGGESTION_ERROR", error);
    const message = error instanceof Error && error.message === "DEEPSEEK_TIMEOUT"
      ? "استغرق إعداد الاقتراح وقتًا أطول من المتوقع. حاول مرة أخرى."
      : "تعذر إعداد الاقتراح الآن. حاول مرة أخرى لاحقًا.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
