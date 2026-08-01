import { prisma } from "@/lib/prisma";
import {
  WORKFLOW_TYPES,
  normalizeWorkflowType,
  type WorkflowType,
} from "@/lib/workflows/workflow-types";
import { getWorkflowSlotTypeAliases } from "@/lib/workflows/workflow-slot";
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

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function parseDefaultValues(value: unknown) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  if (
    (text.startsWith("[") && text.endsWith("]")) ||
    (text.startsWith("{") && text.endsWith("}"))
  ) {
    try {
      return JSON.parse(text);
    } catch {
      // fallback to separator parsing below
    }
  }

  const values = text
    .split(/[\n|,،;]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return values.length > 0 ? values : null;
}

function getFieldDefaultJson(row: ParsedWorkflowRow) {
  const parsed = parseDefaultValues(row.defaultValues);

  if (parsed !== null) {
    return parsed;
  }

  return null;
}

function normalizeFieldType(type: string) {
  const normalized = normalizeText(type).toUpperCase();
  return allowedFieldTypes.has(normalized) ? normalized : "TEXT";
}

function normalizeOptionValue(label: string) {
  return label
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g, "")
    .toLowerCase();
}

function getFieldLinkedToValue(fieldRows: ParsedWorkflowRow[]) {
  const first = fieldRows[0];

  if (!first) return null;

  if (first.fieldLinkedToValue) {
    return first.fieldLinkedToValue;
  }

  const legacyValues = Array.from(
    new Set(
      fieldRows
        .map((row) => normalizeText(row.linkedToValue))
        .filter(Boolean)
    )
  );

  if (
    legacyValues.length === 1 &&
    !fieldRows.some((row) => row.optionLinkedToValue)
  ) {
    return legacyValues[0];
  }

  return null;
}

function getOptionLinkedToValue(row: ParsedWorkflowRow) {
  return row.optionLinkedToValue || row.linkedToValue || null;
}

function getWorkflowDisplayName(params: {
  serviceName: string;
  workflowType: WorkflowType;
}) {
  if (params.workflowType === WORKFLOW_TYPES.GUARDIAN_SUMMONS) {
    return "استدعاء ولي أمر";
  }

  if (params.workflowType === WORKFLOW_TYPES.CERTIFICATE) {
    return "شهادة";
  }

  if (params.workflowType === WORKFLOW_TYPES.LETTER) {
    return "خطاب";
  }

  if (params.workflowType === WORKFLOW_TYPES.FORM) {
    return "نموذج";
  }

  return `${params.serviceName} Workflow`;
}

export async function uploadWorkflowForService(params: {
  serviceSlug: string;
  serviceName: string;
  rows: ParsedWorkflowRow[];
  workflowType?: WorkflowType | string | null;
}) {
  const workflowType = normalizeWorkflowType(params.workflowType);

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


  const latestWorkflow = await prisma.workflow.findFirst({
    where: {
      serviceId: service.id,
      workflowType: { in: getWorkflowSlotTypeAliases(workflowType) },
    },
    orderBy: { version: "desc" },
  });

  const workflow = await prisma.workflow.create({
    data: {
      serviceId: service.id,
      workflowType,
      name: getWorkflowDisplayName({
        serviceName: service.name,
        workflowType,
      }),
      version: latestWorkflow ? latestWorkflow.version + 1 : 1,
      status: "DRAFT",
      isActive: false,
    },
  });

  const stepGroups = new Map<string, ParsedWorkflowRow[]>();

  params.rows.forEach((row) => {
    const existing = stepGroups.get(row.stepTitle) ?? [];
    existing.push(row);
    stepGroups.set(row.stepTitle, existing);
  });

  let stepOrderFallback = 1;
  let fieldsCount = 0;
  let optionsCount = 0;

  for (const [stepTitle, rows] of stepGroups.entries()) {
    const firstStepRow = rows[0];

    const step = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        title: stepTitle,
        description: firstStepRow?.stepDescription ?? null,
        order: firstStepRow?.stepOrder ?? stepOrderFallback,
      },
    });

    stepOrderFallback++;

    const fieldGroups = new Map<string, ParsedWorkflowRow[]>();

    rows.forEach((row) => {
      const existing = fieldGroups.get(row.fieldKey) ?? [];
      existing.push(row);
      fieldGroups.set(row.fieldKey, existing);
    });

    for (const [fieldKey, fieldRows] of fieldGroups.entries()) {
      const first = fieldRows[0];

      if (!first) continue;

      const fieldLinkedToValue = getFieldLinkedToValue(fieldRows);

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
          linkedToValue: fieldLinkedToValue,
          defaultValue: first.defaultValue ?? null,
          defaultJson: getFieldDefaultJson(first) as any,
          autoSelectWhenLinked: first.autoSelectWhenLinked,
        },
      });

      fieldsCount++;

      const seenOptionValues = new Set<string>();

      for (const optionRow of fieldRows) {
        if (!optionRow.optionLabel) continue;

        const optionValue =
          optionRow.optionValue || normalizeOptionValue(optionRow.optionLabel);

        if (!optionValue || seenOptionValues.has(optionValue)) {
          continue;
        }

        seenOptionValues.add(optionValue);

        await prisma.dynamicFieldOption.create({
          data: {
            fieldId: field.id,
            label: optionRow.optionLabel,
            value: optionValue,
            order: optionRow.optionOrder ?? optionsCount + 1,
            linkedToValue: getOptionLinkedToValue(optionRow),
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

