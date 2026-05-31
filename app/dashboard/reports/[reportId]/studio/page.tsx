import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportStudioEditor } from "@/components/reports/report-studio-editor";
import { ReportTemplateLivePreview } from "@/components/report-engine/report-template-live-preview";

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


function getBuilderTemplateFromSnapshot(snapshot: unknown) {
  const data = snapshot as
    | {
        source?: string;
        builderTemplate?: any;
      }
    | null
    | undefined;

  if (data?.source !== "TEMPLATE_BUILDER") {
    return null;
  }

  if (!data.builderTemplate || !Array.isArray(data.builderTemplate.pages)) {
    return null;
  }

  return data.builderTemplate;
}

function parseBuilderTemplateJson(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, any>;
    } catch {
      return null;
    }
  }

  if (typeof value === "object") {
    return value as Record<string, any>;
  }

  return null;
}

async function getBuilderTemplateFromDatabase(templateId?: string | null) {
  if (!templateId) {
    return null;
  }

  if (
    templateId === "official-long" ||
    templateId === "visual-activity" ||
    templateId === "executive-brief"
  ) {
    return null;
  }

  const templateRecord = await prisma.reportTemplate.findUnique({
    where: {
      id: templateId,
    },
  });

  if (!templateRecord) {
    return null;
  }

  const templateJson =
    parseBuilderTemplateJson(templateRecord.templateJson) ||
    parseBuilderTemplateJson(templateRecord.content);

  if (!templateJson || !Array.isArray(templateJson.pages)) {
    return null;
  }

  return {
    ...templateJson,
    id: templateRecord.id,
    name: templateRecord.name || templateJson.name,
    description:
      templateRecord.description ||
      templateJson.description ||
      "قالب تقرير محفوظ من صانع القوالب.",
    serviceSlug: templateRecord.serviceSlug || templateJson.serviceSlug || null,
    status: "PUBLISHED",
  };
}

function buildBuilderStudioPreviewCaseData(
  report: any,
  values: StudioReportValue[]
) {
  const student = report.caseEntry.student;
  const guardian = student?.guardian;

  return {
    id: report.caseEntry.id,
    title: report.caseEntry.title || report.title,
    status: report.caseEntry.status,
    createdAt: report.caseEntry.createdAt?.toISOString?.() || "",
    updatedAt: report.caseEntry.updatedAt?.toISOString?.() || "",
    submittedAt: report.caseEntry.submittedAt?.toISOString?.() || null,
    serviceName: report.caseEntry.service.name,
    serviceSlug: report.caseEntry.service.slug,

    service: {
      id: report.caseEntry.service.id,
      name: report.caseEntry.service.name,
      slug: report.caseEntry.service.slug,
    },

    student: student
      ? {
          id: student.id,
          fullName: student.fullName,
          nationalId: student.nationalId,
          stage: student.stage,
          grade: student.grade,
          classroom: student.classroom,
          guardianName: guardian?.name || null,
          guardianPhone: guardian?.phone || null,
        }
      : null,

    values: values.map((item) => ({
      fieldKey: item.fieldKey,
      fieldLabel: item.fieldLabel,
      value: item.value,
    })),

    evidences: report.evidenceItems
      .filter((item: any) => item.visible !== false)
      .map((item: any) => ({
        id: item.id,
        title: item.caption || item.fileName,
        fileName: item.fileName,
        fileUrl: item.fileUrl || "",
        imageUrl: item.mimeType?.startsWith("image/") ? item.fileUrl : undefined,
        note: item.caption || "",
      })),
  };
}

export default async function ReportStudioPage({ params }: PageProps) {
  const { reportId } = await params;

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

  const builderTemplate =
    getBuilderTemplateFromSnapshot(report.templateSnapshot) ||
    (await getBuilderTemplateFromDatabase(report.templateId));

  if (builderTemplate) {
    const builderPreviewCaseData = buildBuilderStudioPreviewCaseData(
      report,
      liveCaseValues
    );

    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] bg-gradient-to-br from-emerald-950 via-sky-900 to-cyan-700 p-8 text-white shadow-2xl">
          <div>
            <p className="text-sm font-bold text-emerald-100">
              Report Builder Snapshot
            </p>

            <h1 className="mt-3 text-4xl font-black">
              معاينة التقرير بقالب Builder
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-emerald-50">
              هذا التقرير يستخدم القالب المنشور المحفوظ من صانع القوالب، وليس القوالب الثلاثة القديمة.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm">
          <ReportTemplateLivePreview
            template={builderTemplate}
            snippets={[]}
            previewCaseData={builderPreviewCaseData as any}
          />
        </section>
      </main>
    );
  }

  const normalizedReport = {
    id: report.id,
    title: report.title,
    serviceSlug: report.serviceSlug,
    status: report.status,
    genderMode: report.genderMode,
    templateId: report.templateId,
    hasTemplateSnapshot: Boolean(report.templateSnapshot),
    hasReportDataSnapshot: Boolean(report.reportDataSnapshot),
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
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-8 text-white shadow-2xl">
        <div>
          <p className="text-sm font-bold text-sky-100">Report Live Studio</p>

          <h1 className="mt-3 text-4xl font-black">تحرير التقرير</h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-sky-50">
            عدّل النصوص وقيم التقرير قبل الاعتماد. التعديل هنا لا يغيّر الحالة
            الأصلية، بل يحفظ نسخة تحريرية داخل التقرير فقط.
          </p>
        </div>
      </section>

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