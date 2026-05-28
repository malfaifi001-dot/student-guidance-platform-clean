import { prisma } from "@/lib/prisma";
import type { ParsedWorkflowRow } from "@/lib/workflow-upload/workflow-excel-parser";

const allowedFieldTypes = new Set([
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "RADIO",
  "FILE_UPLOAD",
  "IMAGE_UPLOAD",
  "STUDENT_PICKER",
  "PARENT_PICKER",
  "STAFF_PICKER",
  "REPEATER",
  "SIGNATURE",
  "RICH_TEXT",
]);

function normalizeFieldType(type: string) {
  const normalized = type.trim().toUpperCase();
  return allowedFieldTypes.has(normalized) ? normalized : "TEXT";
}

export async function uploadWorkflowForService(params: {
  serviceSlug: string;
  serviceName: string;
  rows: ParsedWorkflowRow[];
}) {
  const service = await prisma.service.upsert({
    where: { slug: params.serviceSlug },
    update: {
      name: params.serviceName,
      status: "ACTIVE",
    },
    create: {
      slug: params.serviceSlug,
      name: params.serviceName,
      status: "ACTIVE",
    },
  });

  await prisma.workflow.updateMany({
    where: {
      serviceId: service.id,
      isActive: true,
    },
    data: {
      isActive: false,
      status: "ARCHIVED",
    },
  });

  const latestWorkflow = await prisma.workflow.findFirst({
    where: { serviceId: service.id },
    orderBy: { version: "desc" },
  });

  const workflow = await prisma.workflow.create({
    data: {
      serviceId: service.id,
      name: `${service.name} Workflow`,
      version: latestWorkflow ? latestWorkflow.version + 1 : 1,
      status: "ACTIVE",
      isActive: true,
    },
  });

  const stepGroups = new Map<string, ParsedWorkflowRow[]>();

  params.rows.forEach((row) => {
    const existing = stepGroups.get(row.stepTitle) ?? [];
    existing.push(row);
    stepGroups.set(row.stepTitle, existing);
  });

  let stepOrder = 1;
  let fieldsCount = 0;
  let optionsCount = 0;

  for (const [stepTitle, rows] of stepGroups.entries()) {
    const step = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        title: stepTitle,
        description: rows[0]?.stepDescription ?? null,
        order: stepOrder,
      },
    });

    stepOrder++;

    const fieldGroups = new Map<string, ParsedWorkflowRow[]>();

    rows.forEach((row) => {
      const existing = fieldGroups.get(row.fieldKey) ?? [];
      existing.push(row);
      fieldGroups.set(row.fieldKey, existing);
    });

    for (const [fieldKey, fieldRows] of fieldGroups.entries()) {
      const first = fieldRows[0];

      if (!first) continue;

      const field = await prisma.dynamicField.create({
        data: {
          stepId: step.id,
          key: fieldKey,
          label: first.fieldLabel,
          type: normalizeFieldType(first.fieldType) as never,
          isRequired: first.fieldRequired,
          order: first.fieldOrder ?? fieldsCount + 1,
          allowOther: first.allowOther,
          dependsOnFieldKey: first.dependsOnFieldKey ?? null,
          linkedToValue: first.linkedToValue ?? null,
        },
      });

      fieldsCount++;

      for (const optionRow of fieldRows) {
        if (!optionRow.optionLabel) continue;

        await prisma.dynamicFieldOption.create({
          data: {
            fieldId: field.id,
            label: optionRow.optionLabel,
            value:
              optionRow.optionValue ||
              optionRow.optionLabel
                .replace(/\s+/g, "_")
                .toLowerCase(),
            order: optionRow.optionOrder ?? optionsCount + 1,
            linkedToValue: optionRow.linkedToValue ?? null,
          },
        });

        optionsCount++;
      }
    }
  }

  return {
    service,
    workflow,
    stepsCount: stepGroups.size,
    fieldsCount,
    optionsCount,
  };
}