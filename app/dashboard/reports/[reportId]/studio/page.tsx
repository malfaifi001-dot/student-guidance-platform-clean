import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportStudioEditor } from "@/components/reports/report-studio-editor";
import { resolveBuilderTemplateForReport } from "@/lib/report-engine/report-builder-template-runtime";

import {
  formatWorkflowDisplayValue,
  getWorkflowFieldKey,
  getWorkflowFieldLabel,
  stringifyWorkflowRawValue,
} from "@/lib/workflow-values/workflow-display-value";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<{
    template?: string;
  }>;
};

type WorkflowValueOverride = {
  fieldKey: string;
  fieldLabel: string;
  originalValue: string;
  editedValue: string;
};

type EditableContentPayload = {
  blocks?: Record<string, string>;
  workflowValueOverrides?: WorkflowValueOverride[];
};

type StudioReportValue = {
  fieldKey: string;
  fieldLabel: string;
  value: string;
};

type ReportFieldLookupItem = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
  options?: Array<{
    label?: string | null;
    value?: string | null;
  }> | null;
};


export default async function ReportStudioPage({ params, searchParams }: PageProps) {
  const { reportId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const report = await prisma.guidanceReport.findUnique({
    where: {
      id: reportId,
    },
    include: {
      evidenceItems: {
        orderBy: {
          sortOrder: "asc",
        },
      },

      caseEntry: {
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
        },
      },
    },
  });

  if (!report) {
    notFound();
  }

  const templateIdOverride =
    resolvedSearchParams.template || report.templateId || "";

  const builderTemplateForStudio = await resolveBuilderTemplateForReport(report, {
    templateIdOverride,
  });

  const parsedEditableContent = parseEditableContent(report.editableContent);
  const workflowValueOverrides =
    parsedEditableContent.workflowValueOverrides || [];

  const fieldMap = buildReportFieldMap(report.caseEntry);

  const normalizedCaseValues = report.caseEntry.values.map((value) =>
    normalizeReportCaseValue(value, fieldMap)
  );

  const liveCaseValues = buildStudioReportValues(
    normalizedCaseValues,
    workflowValueOverrides
  );

  const normalizedReport = {
    id: report.id,
    title: report.title,
    serviceSlug: report.serviceSlug,
    status: report.status,
    genderMode: report.genderMode,
    templateId: templateIdOverride || report.templateId,
    hasTemplateSnapshot: Boolean(builderTemplateForStudio || report.templateSnapshot),
    hasReportDataSnapshot: Boolean(report.reportDataSnapshot),
    templateSnapshot: builderTemplateForStudio
      ? JSON.parse(JSON.stringify(builderTemplateForStudio))
      : report.templateSnapshot
        ? JSON.parse(JSON.stringify(report.templateSnapshot))
        : null,
    reportDataSnapshot: report.reportDataSnapshot
      ? JSON.parse(JSON.stringify(report.reportDataSnapshot))
      : null,
    editableContent: report.editableContent || "",
    renderedContent: report.renderedContent || "",
    generatedAt: report.generatedAt?.toISOString() || null,
    approvedAt: report.approvedAt?.toISOString() || null,
    archivedAt: report.archivedAt?.toISOString() || null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),

    /**
     * مهم:
     * لا نستخدم reportDataSnapshot هنا كمصدر أول؛ لأنه غالبًا يحتوي قيم تقنية قديمة.
     * نستخدم قيم الحالة الحية بعد تحويلها من option.value إلى option.label.
     */
    reportValues: liveCaseValues,

    evidenceItems: report.evidenceItems.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      fileUrl: item.fileUrl,
      caption: item.caption,
      mimeType: item.mimeType,
      size: item.size,
      sortOrder: item.sortOrder,
      visible: item.visible,
      createdAt: item.createdAt.toISOString(),
    })),

    caseEntry: {
      id: report.caseEntry.id,
      title: report.caseEntry.title,
      status: report.caseEntry.status,
      createdAt: report.caseEntry.createdAt.toISOString(),

      service: {
        id: report.caseEntry.service.id,
        name: report.caseEntry.service.name,
        slug: report.caseEntry.service.slug,
      },

      student: report.caseEntry.student
        ? {
            id: report.caseEntry.student.id,
            fullName: report.caseEntry.student.fullName,
            nationalId: report.caseEntry.student.nationalId,
            stage: report.caseEntry.student.stage,
            grade: report.caseEntry.student.grade,
            classroom: report.caseEntry.student.classroom,
            guardianName: report.caseEntry.student.guardian?.name || null,
            guardianPhone: report.caseEntry.student.guardian?.phone || null,
          }
        : null,
    },
  };

  return (
    <main className="space-y-0" dir="rtl">
      <ReportStudioEditor report={normalizedReport} />
    </main>
  );
}

function buildReportFieldMap(caseEntry: any) {
  const map = new Map<string, ReportFieldLookupItem>();

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

function normalizeReportCaseValue(
  value: any,
  fieldMap: Map<string, ReportFieldLookupItem>
) {
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

function buildStudioReportValues(
  values: Array<{
    id: string;
    fieldKey?: string | null;
    value?: string | null;
    jsonValue?: unknown;
    field?: {
      key?: string | null;
      label?: string | null;
      type?: string | null;
      options?: Array<{
        label?: string | null;
        value?: string | null;
      }> | null;
    } | null;
  }>,
  overrides: WorkflowValueOverride[]
): StudioReportValue[] {
  const overrideMap = new Map<string, WorkflowValueOverride>();

  for (const override of overrides) {
    if (override.fieldKey) {
      overrideMap.set(override.fieldKey, override);
    }

    if (override.fieldLabel) {
      overrideMap.set(override.fieldLabel, override);
    }
  }

  return values
    .filter((item) => {
      const key = getWorkflowFieldKey(item);

      return (
        key &&
        key !== "selectedStudent" &&
        !key.endsWith("__other") &&
        !["student", "guardian", "metadata"].includes(key)
      );
    })
    .map((item, index) => {
      const fieldKey = getWorkflowFieldKey(item);
      const fieldLabel = getWorkflowFieldLabel(item, index);

      const displayValue = formatWorkflowDisplayValue(item, values);
      const originalRawValue = stringifyWorkflowRawValue(
        item.value ?? item.jsonValue
      );

      const override =
        overrideMap.get(fieldKey) ||
        overrideMap.get(fieldLabel) ||
        overrideMap.get(item.fieldKey || "");

      return {
        fieldKey,
        fieldLabel,
        value: override?.editedValue ?? displayValue ?? originalRawValue,
      };
    });
}

function parseEditableContent(value?: string | null): EditableContentPayload {
  const content = value?.trim();

  if (!content) {
    return {};
  }

  try {
    const parsed = JSON.parse(content) as EditableContentPayload;

    if (parsed && typeof parsed === "object") {
      return parsed;
    }

    return {};
  } catch {
    return {};
  }
}