import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { buildCaseEntryWhereForUser } from "@/lib/cases/case-access-scope";
import { mapCaseEntryToReportData } from "@/lib/report-engine/report-case-data-mapper";
import {
  formatWorkflowDisplayValue,
  getWorkflowFieldKey,
  getWorkflowFieldLabel,
  type WorkflowValueLike,
} from "@/lib/workflow-values/workflow-display-value";

type FieldLookupItem = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
  options?: Array<{
    label?: string | null;
    value?: string | null;
  }> | null;
};

export async function GET(request: Request) {
  try {
    const auth = await requireDashboardApiContext({ allowPrincipal: true });
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId")?.trim();

    if (!caseId) {
      return NextResponse.json(
        {
          ok: false,
          error: "caseId Ù…Ø·Ù„ÙˆØ¨ Ù„ØªØ¬Ù‡ÙŠØ² Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªÙ‚Ø±ÙŠØ±.",
        },
        { status: 400 }
      );
    }

    const caseEntry = await prisma.caseEntry.findFirst({
      where: {
        id: caseId,
        ...buildCaseEntryWhereForUser({
          id: auth.user.id,
          role: auth.user.role,
          schoolAccountId: auth.schoolAccountId,
          email: auth.user.email,
          historicalPersonalRead: true,
        }),
      },
      include: {
        service: true,

        workflow: {
          include: {
            steps: {
              include: {
                fields: {
                  include: {
                    options: {
                      orderBy: {
                        order: "asc",
                      },
                    },
                  },
                  orderBy: {
                    order: "asc",
                  },
                },
              },
              orderBy: {
                order: "asc",
              },
            },
          },
        },

        student: {
          include: {
            guardian: true,
          },
        },

        values: {
          include: {
            field: {
              include: {
                options: {
                  orderBy: {
                    order: "asc",
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        evidences: {
          orderBy: {
            createdAt: "asc",
          },
        },

        caseEvidences: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!caseEntry) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ø§Ù„Ø­Ø§Ù„Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©.",
        },
        { status: 404 }
      );
    }

    if (
      auth.schoolAccountId &&
      caseEntry.schoolAccountId !== auth.schoolAccountId &&
      caseEntry.createdById === auth.user.id
    ) {
      Object.assign(caseEntry, { student: null });
    }

    const rawReportData = mapCaseEntryToReportData(caseEntry as any);
    const localizedValues = buildLocalizedValues(caseEntry as any);

    const reportData = {
      ...rawReportData,
      values: localizedValues,
    };

    return NextResponse.json({
      ok: true,
      reportData,
    });
  } catch (error) {
    console.error("prepare report error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "ØªØ¹Ø°Ø± ØªØ¬Ù‡ÙŠØ² Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªÙ‚Ø±ÙŠØ±.",
      },
      { status: 500 }
    );
  }
}

function buildFieldMap(caseEntry: any) {
  const map = new Map<string, FieldLookupItem>();

  caseEntry.workflow?.steps?.forEach((step: any) => {
    step.fields?.forEach((field: any) => {
      if (!field?.key) return;

      map.set(field.key, {
        key: field.key,
        label: field.label,
        type: field.type,
        options: field.options || [],
      });
    });
  });

  return map;
}

function normalizeCaseValue(
  value: any,
  fieldMap: Map<string, FieldLookupItem>
): WorkflowValueLike {
  const fieldKey = value.field?.key || value.fieldKey || "";
  const fieldFromWorkflow = fieldMap.get(fieldKey);

  return {
    id: value.id,
    fieldKey,
    value: value.value,
    jsonValue: value.jsonValue,
    field: value.field
      ? {
          key: value.field.key || fieldKey,
          label: value.field.label || fieldFromWorkflow?.label || fieldKey,
          type: value.field.type || fieldFromWorkflow?.type,
          options: value.field.options || fieldFromWorkflow?.options || [],
        }
      : fieldFromWorkflow
        ? fieldFromWorkflow
        : {
            key: fieldKey,
            label: fieldKey,
            options: [],
          },
  };
}

function shouldHideValue(item: WorkflowValueLike) {
  const key = getWorkflowFieldKey(item);

  return (
    !key ||
    key === "selectedStudent" ||
    key.endsWith("__other") ||
    ["student", "guardian", "metadata"].includes(key)
  );
}

type WorkflowReportValueOptionLike = {
  id?: unknown;
  key?: unknown;
  label?: unknown;
  value?: unknown;
  name?: unknown;
};

function cleanWorkflowReportValueText(value: unknown) {
  return String(value ?? "").trim();
}

function uniqueWorkflowReportItems(items: string[]) {
  return Array.from(
    new Set(
      items
        .map((item) => cleanWorkflowReportValueText(item))
        .filter(Boolean)
    )
  );
}

function getWorkflowReportOptionLabels(item: WorkflowValueLike) {
  const source = item as any;
  const field = source.field || {};
  const options = Array.isArray(field.options)
    ? (field.options as WorkflowReportValueOptionLike[])
    : [];
  const labels = new Map<string, string>();

  for (const option of options) {
    const label =
      cleanWorkflowReportValueText(option.label) ||
      cleanWorkflowReportValueText(option.name) ||
      cleanWorkflowReportValueText(option.value) ||
      cleanWorkflowReportValueText(option.key) ||
      cleanWorkflowReportValueText(option.id);

    if (!label) {
      continue;
    }

    for (const key of [option.value, option.key, option.id, option.label, option.name]) {
      const cleanKey = cleanWorkflowReportValueText(key);

      if (cleanKey) {
        labels.set(cleanKey, label);
      }
    }
  }

  return labels;
}

function getWorkflowReportFieldType(item: WorkflowValueLike) {
  const source = item as any;
  return cleanWorkflowReportValueText(source.field?.type).toLowerCase();
}

function isMultiChoiceWorkflowField(item: WorkflowValueLike) {
  const type = getWorkflowReportFieldType(item);

  return (
    type.includes("multi") ||
    type.includes("multiple") ||
    type.includes("checkbox") ||
    type.includes("checklist")
  );
}

function collectWorkflowReportArrayValue(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const arrayKeys = [
    "values",
    "value",
    "selected",
    "selectedValues",
    "selectedOptions",
    "items",
    "options",
    "answers",
  ];

  for (const key of arrayKeys) {
    const candidate = record[key];

    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function resolveWorkflowReportItemLabel(
  value: unknown,
  optionLabels: Map<string, string>
): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => resolveWorkflowReportItemLabel(item, optionLabels))
      .filter(Boolean)
      .join("، ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return (
      resolveWorkflowReportItemLabel(record.label, optionLabels) ||
      resolveWorkflowReportItemLabel(record.name, optionLabels) ||
      resolveWorkflowReportItemLabel(record.value, optionLabels) ||
      resolveWorkflowReportItemLabel(record.key, optionLabels) ||
      resolveWorkflowReportItemLabel(record.id, optionLabels)
    );
  }

  const text = cleanWorkflowReportValueText(value);

  return optionLabels.get(text) || text;
}

function splitMultiDisplayValue(displayValue: string) {
  return uniqueWorkflowReportItems(
    String(displayValue || "")
      .split(/\s*(?:،|,|؛|\r?\n)\s*/g)
      .map((item) => item.trim())
  );
}

function getWorkflowDisplayValueItems(
  item: WorkflowValueLike,
  displayValue: string
) {
  const source = item as any;
  const optionLabels = getWorkflowReportOptionLabels(item);

  const rawItems =
    collectWorkflowReportArrayValue(source.jsonValue).length > 0
      ? collectWorkflowReportArrayValue(source.jsonValue)
      : collectWorkflowReportArrayValue(source.value);

  const directItems = uniqueWorkflowReportItems(
    rawItems.map((value) => resolveWorkflowReportItemLabel(value, optionLabels))
  );

  if (directItems.length > 1) {
    return directItems;
  }

  if (isMultiChoiceWorkflowField(item)) {
    const displayItems = splitMultiDisplayValue(displayValue);

    if (displayItems.length > 1) {
      return displayItems;
    }
  }

  return [];
}

function buildLocalizedValues(caseEntry: any) {
  const fieldMap = buildFieldMap(caseEntry);

  const normalizedValues = caseEntry.values.map((value: any) =>
    normalizeCaseValue(value, fieldMap)
  );

  return normalizedValues
    .filter((item: WorkflowValueLike) => !shouldHideValue(item))
    .map((item: WorkflowValueLike, index: number) => {
      const fieldKey = getWorkflowFieldKey(item);
      const fieldLabel = getWorkflowFieldLabel(item, index);
      const displayValue = formatWorkflowDisplayValue(item, normalizedValues);
      const valueItems = getWorkflowDisplayValueItems(item, displayValue);

      return {
        fieldKey,
        fieldLabel,
        value: displayValue || "—",
        ...(valueItems.length > 1 ? { valueItems } : {}),
      };
    });
}
