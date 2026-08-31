import { NextResponse } from "next/server";
import {
  FieldType,
  Prisma,
  StudentPickerMode,
  WorkflowEvidenceMode,
  WorkflowStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureDefaultPlatformServices } from "@/lib/services/default-platform-services";
import { requireCustomReportContext } from "@/lib/custom-report/custom-report-auth";
import { normalizeCustomReportSchema } from "@/lib/custom-report/custom-report-normalizer";
import type {
  CustomReportField,
  CustomReportSchema,
  CustomReportValues,
} from "@/lib/custom-report/custom-report-types";

const CUSTOM_REPORT_SERVICE_SLUG = "custom-report";

function toRuntimeFieldType(type: string): FieldType {
  const map: Record<string, FieldType> = {
    text: FieldType.TEXT,
    textarea: FieldType.TEXTAREA,
    number: FieldType.NUMBER,
    date: FieldType.DATE,
    select: FieldType.SELECT,
    multi_select: FieldType.MULTI_SELECT,
    checkbox: FieldType.CHECKBOX,
    radio: FieldType.RADIO,
  };

  return map[type] || FieldType.TEXT;
}

function optionLabel(field: CustomReportField, value: string) {
  return field.options?.find((option) => option.value === value)?.label || value;
}

function buildCaseValue(
  field: CustomReportField,
  values: CustomReportValues,
  fieldIdByKey: Map<string, string>,
) {
  const rawValue = values[field.key];
  const otherValue = values[`${field.key}__other`];
  const fieldId = fieldIdByKey.get(field.key) || undefined;

  if (Array.isArray(rawValue)) {
    const labels = rawValue.map((item) =>
      item === "other" && otherValue
        ? `أخرى: ${String(otherValue)}`
        : optionLabel(field, item),
    );

    return {
      fieldId,
      fieldKey: field.key,
      value: labels.length ? labels.join("، ") : null,
      jsonValue: labels.length ? labels : undefined,
    };
  }

  if (typeof rawValue === "boolean") {
    return {
      fieldId,
      fieldKey: field.key,
      value: rawValue ? "نعم" : "لا",
      jsonValue: undefined,
    };
  }

  if (rawValue === "other" && otherValue) {
    return {
      fieldId,
      fieldKey: field.key,
      value: `أخرى: ${String(otherValue)}`,
      jsonValue: {
        value: "أخرى",
        other: String(otherValue),
      },
    };
  }

  if (typeof rawValue === "string") {
    const value = rawValue ? optionLabel(field, rawValue) : null;

    return {
      fieldId,
      fieldKey: field.key,
      value,
      jsonValue: undefined,
    };
  }

  if (typeof rawValue === "number") {
    return {
      fieldId,
      fieldKey: field.key,
      value: String(rawValue),
      jsonValue: undefined,
    };
  }

  return {
    fieldId,
    fieldKey: field.key,
    value: null,
    jsonValue: undefined,
  };
}

function flattenCaseValues(
  schema: CustomReportSchema,
  values: CustomReportValues,
  fieldIdByKey: Map<string, string>,
) {
  return schema.sections
    .flatMap((section) => section.fields)
    .map((field) => buildCaseValue(field, values, fieldIdByKey))
    .filter((item) => item.value !== null || item.jsonValue !== undefined);
}

async function getCustomReportService() {
  await ensureDefaultPlatformServices();

  return prisma.service.findUnique({
    where: {
      slug: CUSTOM_REPORT_SERVICE_SLUG,
    },
    select: {
      id: true,
      slug: true,
    },
  });
}

async function createRuntimeWorkflow(
  tx: Prisma.TransactionClient,
  serviceId: string,
  schema: CustomReportSchema,
) {
  return tx.workflow.create({
    data: {
      serviceId,
      name: schema.title,
      version: 1,
      status: WorkflowStatus.ACTIVE,
      isActive: false,
      workflowType: "custom-report",
      studentPickerMode: StudentPickerMode.DISABLED,
      evidenceMode: WorkflowEvidenceMode.DISABLED,
      steps: {
        create: schema.sections.map((section, sectionIndex) => ({
          title: section.title,
          description: section.description || null,
          order: section.order || sectionIndex + 1,
          fields: {
            create: section.fields.map((field, fieldIndex) => ({
              key: field.key,
              label: field.label,
              type: toRuntimeFieldType(field.type),
              placeholder: field.placeholder || null,
              helpText: field.helpText || null,
              isRequired: Boolean(field.required),
              order: field.order || fieldIndex + 1,
              dependsOnFieldKey: null,
              linkedToValue: null,
              allowOther: Boolean(field.options?.some((option) => option.value === "other")),
              isRepeater: false,
              options: {
                create: (field.options || []).map((option, optionIndex) => ({
                  label: option.label,
                  value: option.value,
                  order: optionIndex + 1,
                  linkedToValue: null,
                })),
              },
            })),
          },
        })),
      },
    },
    include: {
      service: true,
      steps: {
        orderBy: {
          order: "asc",
        },
        include: {
          fields: {
            orderBy: {
              order: "asc",
            },
            include: {
              options: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      },
    },
  });
}

function buildWorkflowSnapshot(workflow: Awaited<ReturnType<typeof createRuntimeWorkflow>>) {
  return {
    id: workflow.id,
    name: workflow.name,
    serviceSlug: workflow.service.slug,
    studentPickerMode: workflow.studentPickerMode || "DISABLED",
    evidenceMode: workflow.evidenceMode || "DISABLED",
    steps: workflow.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      order: step.order,
      fields: step.fields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        helpText: field.helpText,
        isRequired: field.isRequired,
        order: field.order,
        dependsOnFieldKey: field.dependsOnFieldKey,
        linkedToValue: field.linkedToValue,
        allowOther: field.allowOther,
        isRepeater: field.isRepeater,
        options: field.options.map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          order: option.order,
          linkedToValue: option.linkedToValue,
        })),
      })),
    })),
  };
}

function buildFieldIdMap(workflow: Awaited<ReturnType<typeof createRuntimeWorkflow>>) {
  const map = new Map<string, string>();

  for (const step of workflow.steps) {
    for (const field of step.fields) {
      map.set(field.key, field.id);
    }
  }

  return map;
}

export async function GET() {
  const context = await requireCustomReportContext();

  if (!context.ok) {
    return NextResponse.json({ error: context.message }, { status: context.status });
  }

  const service = await getCustomReportService();

  if (!service) {
    return NextResponse.json({ entries: [] });
  }

  const entries = await prisma.caseEntry.findMany({
    where: {
      serviceId: service.id,
      createdById: context.user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 20,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const context = await requireCustomReportContext();

  if (!context.ok) {
    return NextResponse.json({ error: context.message }, { status: context.status });
  }

  if (!context.schoolAccountId) {
    return NextResponse.json(
      { error: "أكمل بيانات المدرسة قبل إنشاء تقرير خاص." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const values = body?.values && typeof body.values === "object" ? body.values : {};
  const schema = normalizeCustomReportSchema(body?.schema);
  const status = body?.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT";
  const service = await getCustomReportService();

  if (!service) {
    return NextResponse.json(
      { error: "تعذر تجهيز خدمة التقرير المخصص." },
      { status: 500 },
    );
  }

  const caseEntry = await prisma.$transaction(async (tx) => {
    const workflow = await createRuntimeWorkflow(tx, service.id, schema);
    const fieldIdByKey = buildFieldIdMap(workflow);
    const workflowSnapshot = buildWorkflowSnapshot(workflow);
    const caseValues = flattenCaseValues(schema, values, fieldIdByKey);

    const createdCase = await tx.caseEntry.create({
      data: {
        schoolAccountId: context.schoolAccountId!,
        serviceId: service.id,
        workflowId: workflow.id,
        workflowSnapshot,
        createdById: context.user.id,
        title: schema.title,
        status,
        submittedAt: status === "SUBMITTED" ? new Date() : null,
      },
      select: {
        id: true,
      },
    });

    if (caseValues.length > 0) {
      const valueRows: Prisma.CaseValueCreateManyInput[] = caseValues.map((item) => ({
        caseEntryId: createdCase.id,
        fieldId: item.fieldId,
        fieldKey: item.fieldKey,
        value: item.value,
        ...(item.jsonValue === undefined
          ? {}
          : {
              jsonValue: item.jsonValue as Prisma.InputJsonValue,
            }),
      }));

      await tx.caseValue.createMany({
        data: valueRows,
      });
    }

    return createdCase;
  });

  return NextResponse.json({
    caseId: caseEntry.id,
    redirectTo: `/dashboard/cases/${caseEntry.id}`,
  });
}
