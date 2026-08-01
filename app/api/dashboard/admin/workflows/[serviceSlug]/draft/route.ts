import { NextResponse } from "next/server";
const FieldType = {
  TEXT: "TEXT",
  TEXTAREA: "TEXTAREA",
  NUMBER: "NUMBER",
  DATE: "DATE",
  SELECT: "SELECT",
  MULTI_SELECT: "MULTI_SELECT",
  CHECKBOX: "CHECKBOX",
  RADIO: "RADIO",
  FILE: "FILE",
  STUDENT_PICKER: "STUDENT_PICKER",
} as const;

type FieldType = (typeof FieldType)[keyof typeof FieldType];

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";
import { normalizeWorkflowType } from "@/lib/workflows/workflow-types";
import { getWorkflowSlotTypeAliases } from "@/lib/workflows/workflow-slot";
import {
  normalizeWorkflowEvidenceMode,
  normalizeWorkflowStudentPickerMode,
} from "@/lib/workflows/workflow-runtime-settings";

type RouteContext = {
  params: Promise<{
    serviceSlug: string;
  }>;
};

const FIELD_TYPES = new Set(["TEXT", "TEXTAREA", "NUMBER", "DATE", "SELECT", "MULTI_SELECT", "CHECKBOX", "RADIO", "FILE", "STUDENT_PICKER"]);

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeFieldType(value: unknown): string {
  const text = clean(value).toUpperCase();

  return FIELD_TYPES.has(text as string)
    ? (text as string)
    : "TEXT";
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;

  const text = clean(value).toLowerCase();

  return ["1", "true", "yes", "y", "نعم", "صح", "مطلوب"].includes(text);
}

function toPositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const adminError = await requireAdminApi();

    if (adminError) {
      return adminError;
    }

    const { serviceSlug } = await context.params;
    const body = await request.json();

    const service = await prisma.service.findUnique({
      where: {
        slug: serviceSlug,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: "الخدمة غير موجودة.",
        },
        { status: 404 },
      );
    }

    const name = clean(body?.name) || `${service.name} Workflow`;
    const workflowType = normalizeWorkflowType(body?.workflowType);
    const studentPickerMode = normalizeWorkflowStudentPickerMode(
      body?.studentPickerMode,
    );
    const evidenceMode = normalizeWorkflowEvidenceMode(body?.evidenceMode);
    const steps = Array.isArray(body?.steps) ? body.steps : [];

    if (!steps.length) {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن إنشاء Workflow بدون خطوات.",
        },
        { status: 400 },
      );
    }

    for (const step of steps) {
      if (!Array.isArray(step?.fields) || step.fields.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `الخطوة "${step?.title || "بدون عنوان"}" لا تحتوي على حقول.`,
          },
          { status: 400 },
        );
      }
    }

    const versionAggregate = await prisma.workflow.aggregate({
      where: {
        serviceId: service.id,
        workflowType: { in: getWorkflowSlotTypeAliases(workflowType) },
      },
      _max: {
        version: true,
      },
    });

    const nextVersion = (versionAggregate._max.version || 0) + 1;

    const workflow = await prisma.workflow.create({
      data: {
        serviceId: service.id,
        name,
        version: nextVersion,
        workflowType,
        studentPickerMode: studentPickerMode as any,
        evidenceMode: evidenceMode as any,
        status: "DRAFT",
        isActive: false,
        steps: {
          create: steps.map((step: any, stepIndex: number) => ({
            title: clean(step.title) || `خطوة ${stepIndex + 1}`,
            description: clean(step.description) || null,
            order: toPositiveNumber(step.order, stepIndex + 1),
            fields: {
              create: (Array.isArray(step.fields) ? step.fields : []).map(
                (field: any, fieldIndex: number) => ({
                  key: clean(field.key) || `field_${fieldIndex + 1}`,
                  label:
                    clean(field.label) ||
                    clean(field.key) ||
                    `حقل ${fieldIndex + 1}`,
                  type: normalizeFieldType(field.type),
                  placeholder: clean(field.placeholder) || null,
                  helpText: clean(field.helpText) || null,
                  isRequired: toBoolean(field.isRequired),
                  order: toPositiveNumber(field.order, fieldIndex + 1),
                  allowOther: toBoolean(field.allowOther),
                  dependsOnFieldKey: clean(field.dependsOnFieldKey) || null,
                  linkedToValue: clean(field.linkedToValue) || null,
                  options: {
                    create: (Array.isArray(field.options)
                      ? field.options
                      : []
                    ).map((option: any, optionIndex: number) => ({
                      label: clean(option.label) || `خيار ${optionIndex + 1}`,
                      value:
                        clean(option.value) ||
                        clean(option.label) ||
                        `option_${optionIndex + 1}`,
                      order: toPositiveNumber(option.order, optionIndex + 1),
                      linkedToValue: clean(option.linkedToValue) || null,
                    })),
                  },
                }),
              ),
            },
          })),
        },
      },
      include: {
        steps: {
          include: {
            fields: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    await prisma.platformActivityLog
      .create({
        data: {
          category: "WORKFLOW",
          action: "DRAFT_CREATED",
          severity: "INFO",
          title: "تم إنشاء مسودة Workflow",
          details: {
            serviceSlug: service.slug,
            serviceName: service.name,
            workflowId: workflow.id,
            workflowName: workflow.name,
            workflowType,
            version: workflow.version,
            stepsCount: workflow.steps.length,
          },
        },
      })
      .catch(() => null);

    return NextResponse.json({
      success: true,
      message: "تم إنشاء مسودة Workflow بنجاح.",
      workflowId: workflow.id,
      version: workflow.version,
    });
  } catch (error) {
    console.error("WORKFLOW_DRAFT_CREATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إنشاء مسودة Workflow.",
      },
      { status: 400 },
    );
  }
}
