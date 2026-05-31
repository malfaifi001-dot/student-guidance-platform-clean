import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import type { ReportViewMode } from "@/components/reports/report-preview-toolbar";

import { ReportDocumentRenderer } from "@/components/report-engine/report-document-renderer";
import { ReportBuilderPdfRenderer } from "@/components/report-engine/report-builder-pdf-renderer";
import { ReportPdfGuidanceCard } from "@/components/reports/report-pdf-guidance-card";

import type {
  EvidenceLayout,
  OfficialReportData,
  ReportEvidence,
  ReportIdentity,
  ReportSection,
  ReportTemplateId,
} from "@/lib/report-engine/report-types";

import { buildSmartReportTextSections } from "@/lib/report-engine/report-smart-text-engine";

import {
  buildBuilderPreviewCaseData,
  resolveBuilderTemplateForReport,
} from "@/lib/report-engine/report-builder-template-runtime";
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
    evidenceLayout?: string;
    cover?: string;
    studio?: string;
    view?: string;
    pdf?: string;
    v?: string;
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

type ReportValueItem = {
  fieldKey: string;
  fieldLabel: string;
  originalValue: string;
  displayValue: string;
  isChanged: boolean;
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

const blockLabels: Record<string, string> = {
  summaryIntro: "ملخص التقرير",
  intro: "مقدمة التقرير",
  goals: "أهداف البرنامج",
  procedures: "الإجراءات",
  results: "النتائج",
  recommendations: "التوصيات",
  closingNotes: "ملاحظات ختامية",
  evidenceNotes: "ملاحظات الشواهد",
};

const blockOrder = [
  "summaryIntro",
  "intro",
  "goals",
  "procedures",
  "results",
  "recommendations",
  "closingNotes",
  "evidenceNotes",
];

const allowedTemplates: ReportTemplateId[] = [
  "official-long",
  "executive-brief",
  "visual-activity",
];

const allowedEvidenceLayouts: EvidenceLayout[] = [
  "auto",
  "grid-2x2",
  "two-columns",
  "stacked",
  "single-large",
  "one-per-page",
];

const allowedReportViewModes: ReportViewMode[] = ["text", "grid", "mixed"];

export default async function ReportRealPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { reportId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const evidenceLayoutMode = normalizeEvidenceLayoutMode(
    resolvedSearchParams.evidenceLayout
  );

  const studioMode = resolvedSearchParams.studio === "true";
  const pdfMode = resolvedSearchParams.pdf === "true";
  const showCover = resolvedSearchParams.cover !== "false";

  const report = await prisma.guidanceReport.findUnique({
    where: {
      id: reportId,
    },
    include: {
      caseEntry: {
        include: {
          service: true,

          schoolAccount: {
            include: {
              profile: true,
            },
          },

          createdBy: true,

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
        },
      },

      evidenceItems: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!report) {
    notFound();
  }

  const selectedTemplate = resolveTemplateId(
    resolvedSearchParams.template || report.templateId
  );

  const selectedEvidenceLayout = resolveEvidenceLayout(
    resolvedSearchParams.evidenceLayout
  );

  const selectedViewMode = resolveReportViewMode(resolvedSearchParams.view);

  const parsedEditableContent = parseEditableContent(report.editableContent);
  const workflowValueOverrides =
    parsedEditableContent.workflowValueOverrides || [];

  const fieldMap = buildReportFieldMap(report.caseEntry);

  const normalizedCaseValues = report.caseEntry.values.map((value) =>
    normalizeReportCaseValue(value, fieldMap)
  );

  const reportValues = buildReportValues(
    normalizedCaseValues,
    workflowValueOverrides
  );

  const identity = buildReportIdentity(report);

  const officialReport = buildOfficialReportData({
    report,
    reportValues,
    parsedEditableContent,
    evidenceLayout: selectedEvidenceLayout,
    viewMode: selectedViewMode,
  });

  const builderTemplate = await resolveBuilderTemplateForReport(report, {
    templateIdOverride: resolvedSearchParams.template || report.templateId,
  });

  const builderPreviewCaseData = builderTemplate
    ? buildBuilderPreviewCaseData(report, reportValues)
    : null;

  const pdfExportUrl = `/api/dashboard/reports/${report.id}/export/pdf?template=${encodeURIComponent(
    resolvedSearchParams.template || report.templateId || ""
  )}&evidenceLayout=${encodeURIComponent(
    selectedEvidenceLayout
  )}&cover=${encodeURIComponent(String(showCover))}&view=${encodeURIComponent(
    selectedViewMode
  )}`;

  const pdfPreviewUrl = `${pdfExportUrl}&inline=true`;

  const editReportUrl = `/dashboard/reports/${report.id}/studio`;

  const backToReportsUrl = "/dashboard/reports";

  return (
    <main
      dir="rtl"
      className={
        pdfMode
          ? "min-h-screen bg-white p-0"
          : studioMode
            ? "min-h-screen bg-slate-100 py-5"
            : "min-h-screen bg-slate-50 px-6 py-8"
      }
    >

      {!studioMode ? (
        <div className="no-print mx-auto mb-3 flex max-w-[210mm] justify-start">
          <a
            href={backToReportsUrl}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span aria-hidden="true">←</span>
            الرجوع للتقارير
          </a>
        </div>
      ) : null}

      {!studioMode ? (
        <ReportPdfGuidanceCard
          reportTitle={report.title}
          serviceName={report.caseEntry.service.name}
          editUrl={editReportUrl}
          pdfPreviewUrl={pdfPreviewUrl}
          pdfDownloadUrl={pdfExportUrl}
        />
      ) : null}

      <section className={pdfMode ? "mx-auto bg-white" : studioMode ? "mx-auto" : "mx-auto mt-4 max-w-[210mm]"}>
        {builderTemplate ? (
          <ReportBuilderPdfRenderer
            template={builderTemplate}
            previewCaseData={builderPreviewCaseData as any}
            identity={identity}
            editorialBlocks={parsedEditableContent.blocks || {}}
            evidenceLayoutMode={evidenceLayoutMode}
          />
        ) : (
          <ReportDocumentRenderer
            identity={identity}
            report={officialReport}
            templateId={selectedTemplate}
            showCover={showCover}
            evidenceLayout={selectedEvidenceLayout}
          />
        )}
      </section>
    </main>
  );
}

function buildReportIdentity(report: any) {
  const profile = report.caseEntry.schoolAccount.profile;
  const schoolAccount = report.caseEntry.schoolAccount;

  return {
    ministryName: "وزارة التعليم",

    educationDepartment: profile?.district
      ? `إدارة التعليم - ${profile.district}`
      : "إدارة التعليم",

    educationOffice: profile?.city
      ? `مكتب التعليم - ${profile.city}`
      : "مكتب التعليم",

    schoolName: profile?.schoolName || schoolAccount.name || "اسم المدرسة",

    counselorName:
      report.caseEntry.createdBy?.name || "الموجه/الموجهة الطلابية",

    counselorTitle: "الموجه/الموجهة الطلابية",

    academicYear: profile?.academicYear || "العام الدراسي",

    semester: profile?.currentSemester || "الفصل الدراسي",

    schoolLogoUrl: undefined,

    ministryLogoUrl: undefined,
  } as ReportIdentity;
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

function buildOfficialReportData({
  report,
  reportValues,
  parsedEditableContent,
  evidenceLayout,
  viewMode,
}: {
  report: any;
  reportValues: ReportValueItem[];
  parsedEditableContent: EditableContentPayload;
  evidenceLayout: EvidenceLayout;
  viewMode: ReportViewMode;
}) {
  const student = report.caseEntry.student;
  const guardian = student?.guardian;
  const profile = report.caseEntry.schoolAccount.profile;

  const reportDate = formatDate(report.generatedAt || report.createdAt);

  const executionDate =
    findValueByKeys(reportValues, [
      "date",
      "execution_date",
      "program_date",
      "gregorian_date",
      "تاريخ",
      "التاريخ",
    ]) || reportDate;

  const programTitle =
    findValueByKeys(reportValues, [
      "program",
      "program_name",
      "program_title",
      "عنوان البرنامج",
      "البرنامج",
    ]) || report.title;

  const targetGroup =
    findValueByKeys(reportValues, [
      "target",
      "beneficiaries",
      "target_group",
      "المستفيدون",
      "الفئة المستهدفة",
    ]) ||
    [student?.stage, student?.grade, student?.classroom]
      .filter(Boolean)
      .join(" - ") ||
    "غير محدد";

  const editableSections = buildEditableSections(parsedEditableContent);

  const hasManualIntro =
    Boolean(parsedEditableContent.blocks?.intro?.trim()) ||
    Boolean(parsedEditableContent.blocks?.summaryIntro?.trim());

  const smartNarrativeSections = hasManualIntro
    ? []
    : buildSmartReportTextSections({
        serviceName: report.caseEntry.service.name,
        reportTitle: report.title,
        programTitle,
        executionDate,
        targetGroup,
        reportValues,
        evidenceCount:
          report.evidenceItems.length || report.caseEntry.evidences.length,
      });

  const studentSection = buildStudentSection(student, guardian);
  const workflowSections = buildWorkflowSections(reportValues);

  const sections = buildSectionsByViewMode({
    viewMode,
    smartNarrativeSections,
    editableSections,
    studentSection,
    workflowSections,
  });

  const evidences = buildReportEvidences(report);

  return {
    title: report.title,
    subtitle: report.caseEntry.title || report.caseEntry.service.name,
    serviceName: report.caseEntry.service.name,
    category: report.caseEntry.service.name,
    reportDate,
    targetGroup,
    evidenceLayout,

    cover: {
      programTitle,
      executionDate,

      schoolYear:
        profile?.academicYear ||
        findValueByKeys(reportValues, [
          "academic_year",
          "school_year",
          "العام الدراسي",
          "السنة الدراسية",
        ]) ||
        "العام الدراسي",

      semester:
        findValueByKeys(reportValues, [
          "semester",
          "الفصل الدراسي",
          "الفصل",
        ]) ||
        profile?.currentSemester ||
        "الفصل الدراسي",

      shortDescription:
        parsedEditableContent.blocks?.summaryIntro ||
        parsedEditableContent.blocks?.intro ||
        `تقرير يوثق ${report.caseEntry.service.name} بناءً على بيانات الحالة والشواهد المرتبطة بها.`,
    },

    sections,

    evidences,

    approval: {
      counselorName:
        report.caseEntry.createdBy?.name || "الموجه/الموجهة الطلابية",
      principalName: profile?.principalName || "قائد/قائدة المدرسة",
      date: reportDate,
    },
  } as OfficialReportData;
}

function buildStudentSection(student: any, guardian: any): ReportSection[] {
  if (!student) {
    return [];
  }

  return [
    {
      id: "student-info",
      title: "بيانات الطالب/الطالبة",
      content: "",
      items: [
        {
          label: "اسم الطالب/الطالبة",
          value: student.fullName,
        },
        {
          label: "رقم الهوية",
          value: student.nationalId || "غير متوفر",
        },
        {
          label: "المرحلة",
          value: student.stage || "غير محدد",
        },
        {
          label: "الصف",
          value: student.grade || "غير محدد",
        },
        {
          label: "الفصل",
          value: student.classroom || "غير محدد",
        },
        {
          label: "ولي الأمر",
          value: guardian?.name || "غير متوفر",
        },
        {
          label: "جوال ولي الأمر",
          value: guardian?.phone || "غير متوفر",
        },
      ],
    },
  ];
}

function buildSectionsByViewMode({
  viewMode,
  smartNarrativeSections,
  editableSections,
  studentSection,
  workflowSections,
}: {
  viewMode: ReportViewMode;
  smartNarrativeSections: ReportSection[];
  editableSections: ReportSection[];
  studentSection: ReportSection[];
  workflowSections: ReportSection[];
}): ReportSection[] {
  if (viewMode === "text") {
    return [...smartNarrativeSections, ...editableSections, ...studentSection];
  }

  if (viewMode === "grid") {
    return [...studentSection, ...workflowSections];
  }

  return [
    ...smartNarrativeSections,
    ...editableSections,
    ...studentSection,
    ...workflowSections,
  ];
}

function buildEditableSections(
  parsedEditableContent: EditableContentPayload
): ReportSection[] {
  const blocks = parsedEditableContent.blocks || {};
  const sections: ReportSection[] = [];

  for (const key of blockOrder) {
    const content = blocks[key]?.trim();

    if (!content) continue;

    sections.push({
      id: `editorial-${key}`,
      title: blockLabels[key] || key,
      content,
    });
  }

  return sections;
}

function buildWorkflowSections(reportValues: ReportValueItem[]): ReportSection[] {
  const importantKeys = [
    "program",
    "program_name",
    "semester",
    "week",
    "day",
    "date",
    "gregorian_date",
    "hijri_date",
    "beneficiaries",
    "target_group",
    "execution_action",
    "execution_mechanism",
    "performance_indicator",
    "evidence_suggestion",
    "operation",
    "recommendations",
    "notes",
  ];

  const primaryItems = reportValues
    .filter((item) =>
      importantKeys.some(
        (key) =>
          item.fieldKey.toLowerCase().includes(key.toLowerCase()) ||
          normalizeSearchText(item.fieldLabel).includes(normalizeSearchText(key))
      )
    )
    .map((item) => ({
      label: item.fieldLabel,
      value: item.displayValue || "—",
    }));

  const otherItems = reportValues
    .filter(
      (item) =>
        !importantKeys.some(
          (key) =>
            item.fieldKey.toLowerCase().includes(key.toLowerCase()) ||
            normalizeSearchText(item.fieldLabel).includes(
              normalizeSearchText(key)
            )
        )
    )
    .map((item) => ({
      label: item.fieldLabel,
      value: item.displayValue || "—",
    }));

  const sections: ReportSection[] = [];

  if (primaryItems.length) {
    sections.push({
      id: "workflow-primary",
      title: "بيانات البرنامج والتنفيذ",
      content: "",
      items: primaryItems,
    });
  }

  if (otherItems.length) {
    sections.push({
      id: "workflow-extra",
      title: "بيانات إضافية من الحالة",
      content: "",
      items: otherItems,
    });
  }

  return sections;
}

function buildReportEvidences(report: any): ReportEvidence[] {
  const reportEvidenceItems = report.evidenceItems
    .filter((item: any) => item.visible)
    .map((item: any) => ({
      id: item.id,
      title: item.caption || item.fileName,
      description: item.caption || "",
      fileName: item.fileName,
      imageUrl: isImageMime(item.mimeType) ? item.fileUrl : undefined,
      fileUrl: item.fileUrl,
    }));

  if (reportEvidenceItems.length) {
    return reportEvidenceItems;
  }

  return report.caseEntry.evidences.map((item: any) => ({
    id: item.id,
    title: item.note || item.fileName || "شاهد",
    description: item.note || "",
    fileName: item.fileName || "مرفق",
    imageUrl: isImageMime(item.mimeType) ? item.fileUrl || undefined : undefined,
    fileUrl: item.fileUrl || undefined,
  }));
}

function buildReportValues(
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
): ReportValueItem[] {
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

      const originalValue = stringifyWorkflowRawValue(
        item.value ?? item.jsonValue
      );

      const originalDisplayValue = formatWorkflowDisplayValue(item, values);

      const override =
        overrideMap.get(fieldKey) ||
        overrideMap.get(fieldLabel) ||
        overrideMap.get(item.fieldKey || "");

      const displayValue = override?.editedValue ?? originalDisplayValue;

      return {
        fieldKey,
        fieldLabel,
        originalValue,
        displayValue,
        isChanged: Boolean(
          override &&
            override.editedValue.trim() !== originalDisplayValue.trim()
        ),
      };
    });
}

function parseEditableContent(value?: unknown): EditableContentPayload {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value as EditableContentPayload;
  }

  if (typeof value !== "string") {
    return {};
  }

  const content = value.trim();

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

function findValueByKeys(items: ReportValueItem[], keys: string[]) {
  const normalizedKeys = keys.map(normalizeSearchText);

  const found = items.find((item) => {
    const key = normalizeSearchText(item.fieldKey);
    const label = normalizeSearchText(item.fieldLabel);

    return normalizedKeys.some(
      (target) => key.includes(target) || label.includes(target)
    );
  });

  return found?.displayValue?.trim() || "";
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveTemplateId(value?: string | null): ReportTemplateId {
  if (value && allowedTemplates.includes(value as ReportTemplateId)) {
    return value as ReportTemplateId;
  }

  return "official-long";
}

function resolveEvidenceLayout(value?: string | null): EvidenceLayout {
  if (value && allowedEvidenceLayouts.includes(value as EvidenceLayout)) {
    return value as EvidenceLayout;
  }

  return "grid-2x2";
}

function resolveReportViewMode(value?: string | null): ReportViewMode {
  if (value && allowedReportViewModes.includes(value as ReportViewMode)) {
    return value as ReportViewMode;
  }

  return "mixed";
}

function isImageMime(mimeType?: string | null) {
  return Boolean(mimeType?.startsWith("image/"));
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return new Date().toLocaleDateString("ar-SA");

  try {
    return new Date(value).toLocaleDateString("ar-SA");
  } catch {
    return String(value);
  }
}

function normalizeEvidenceLayoutMode(value?: string | null) {
  if (
    value === "auto" ||
    value === "one-per-page" ||
    value === "two-per-page" ||
    value === "grid-2x2" ||
    value === "compact"
  ) {
    return value;
  }

  return "two-per-page";
}
