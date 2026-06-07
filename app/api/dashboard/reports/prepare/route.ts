import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
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

    const caseEntry = await prisma.caseEntry.findUnique({
      where: {
        id: caseId,
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

      return {
        fieldKey,
        fieldLabel,
        value: displayValue || "â€”",
      };
    });
}
