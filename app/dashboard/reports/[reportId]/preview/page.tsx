import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { OfficialFeatureRequiredPage } from "@/components/auth/official-feature-required-page";
import { canUseOfficialFeatures, getMissingOfficialIdentityItems } from "@/lib/auth/official-feature-guard";
import { buildReportIdentityFromCurrentUser } from "@/lib/report-engine/report-identity-runtime";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

import type { ReportViewMode } from "@/components/reports/report-preview-toolbar";

import { ReportDocumentRenderer } from "@/components/report-engine/report-document-renderer";
import { FinalReportDesignRenderer } from "@/components/report-engine/design-renderers/report-design-renderer";
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
    inline?: string;
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
  summaryIntro: "Ù…Ù„Ø®Øµ Ø§Ù„ØªÙ‚Ø±ÙŠØ±",
  intro: "Ù…Ù‚Ø¯Ù…Ø© Ø§Ù„ØªÙ‚Ø±ÙŠØ±",
  goals: "Ø£Ù‡Ø¯Ø§Ù Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬",
  procedures: "Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª",
  results: "Ø§Ù„Ù†ØªØ§Ø¦Ø¬",
  recommendations: "Ø§Ù„ØªÙˆØµÙŠØ§Øª",
  closingNotes: "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø®ØªØ§Ù…ÙŠØ©",
  evidenceNotes: "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø´ÙˆØ§Ù‡Ø¯",
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
  const currentSession = await getCurrentSessionUser();
  const runtimeReportIdentity = buildReportIdentityFromCurrentUser(
    currentSession?.user ?? null
  );

  const officialIdentityMissingItems = currentSession?.user
    ? getMissingOfficialIdentityItems(currentSession.user)
    : [];

  const officialIdentityReady = currentSession?.user
    ? canUseOfficialFeatures(currentSession.user)
    : false;

  const pdfMode =
    resolvedSearchParams.pdf === "true" ||
    resolvedSearchParams.studio === "true" ||
    resolvedSearchParams.inline === "true";

  if (!officialIdentityReady && !pdfMode) {
    return (
      <OfficialFeatureRequiredPage
        title="Ø£ÙƒÙ…Ù„ Ù‡ÙˆÙŠØ© Ø§Ù„Ù…Ø¯Ø±Ø³Ø© Ù‚Ø¨Ù„ Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø±Ø³Ù…ÙŠ"
        description="Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø±Ø³Ù…ÙŠ ØªØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¯Ø±Ø³Ø© ÙˆØ§Ù„Ù…ÙˆØ¬Ù‡/Ø§Ù„Ù…ÙˆØ¬Ù‡Ø© Ø­ØªÙ‰ ØªØ¸Ù‡Ø± Ø§Ù„ØªØ±ÙˆÙŠØ³Ø© ÙˆØ§Ù„ØºÙ„Ø§Ù Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­."
        missingItems={officialIdentityMissingItems.map((item) => ({
          label: item,
          description: "Ù‡Ø°Ø§ Ø§Ù„Ø­Ù‚Ù„ Ù…Ø·Ù„ÙˆØ¨ Ø­ØªÙ‰ ØªØ¸Ù‡Ø± Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ø±Ø³Ù…ÙŠØ© Ø¨Ù‡ÙˆÙŠØ© Ù…ÙƒØªÙ…Ù„Ø©.",
        }))}
      />
    );
  }
  const evidenceLayoutMode = normalizeEvidenceLayoutMode(
    resolvedSearchParams.evidenceLayout
  );

  const studioMode = resolvedSearchParams.studio === "true";
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

  const editReportUrl = `/dashboard/reports/${report.id}/studio?template=${encodeURIComponent(resolvedSearchParams.template || report.templateId || "")}`;

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
          <FinalReportDesignRenderer
            template={builderTemplate as any}
            previewCaseData={builderPreviewCaseData as any}
            identity={runtimeReportIdentity as any}
            editorialBlocks={parsedEditableContent.blocks || {}}
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
    ministryName: "ÙˆØ²Ø§Ø±Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…",

    educationDepartment: profile?.district
      ? `Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ… - ${profile.district}`
      : "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…",

    educationOffice: profile?.city
      ? `Ù…ÙƒØªØ¨ Ø§Ù„ØªØ¹Ù„ÙŠÙ… - ${profile.city}`
      : "Ù…ÙƒØªØ¨ Ø§Ù„ØªØ¹Ù„ÙŠÙ…",

    schoolName: profile?.schoolName || schoolAccount.name || "Ø§Ø³Ù… Ø§Ù„Ù…Ø¯Ø±Ø³Ø©",

    counselorName:
      report.caseEntry.createdBy?.name || "Ø§Ù„Ù…ÙˆØ¬Ù‡/Ø§Ù„Ù…ÙˆØ¬Ù‡Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ÙŠØ©",

    counselorTitle: "Ø§Ù„Ù…ÙˆØ¬Ù‡/Ø§Ù„Ù…ÙˆØ¬Ù‡Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ÙŠØ©",

    academicYear: profile?.academicYear || "Ø§Ù„Ø¹Ø§Ù… Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ",

    semester: profile?.currentSemester || "Ø§Ù„ÙØµÙ„ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ",

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
      "ØªØ§Ø±ÙŠØ®",
      "Ø§Ù„ØªØ§Ø±ÙŠØ®",
    ]) || reportDate;

  const programTitle =
    findValueByKeys(reportValues, [
      "program",
      "program_name",
      "program_title",
      "Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬",
      "Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬",
    ]) || report.title;

  const targetGroup =
    findValueByKeys(reportValues, [
      "target",
      "beneficiaries",
      "target_group",
      "Ø§Ù„Ù…Ø³ØªÙÙŠØ¯ÙˆÙ†",
      "Ø§Ù„ÙØ¦Ø© Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØ©",
    ]) ||
    [student?.stage, student?.grade, student?.classroom]
      .filter(Boolean)
      .join(" - ") ||
    "ØºÙŠØ± Ù…Ø­Ø¯Ø¯";

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
          "Ø§Ù„Ø¹Ø§Ù… Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ",
          "Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©",
        ]) ||
        "Ø§Ù„Ø¹Ø§Ù… Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ",

      semester:
        findValueByKeys(reportValues, [
          "semester",
          "Ø§Ù„ÙØµÙ„ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ",
          "Ø§Ù„ÙØµÙ„",
        ]) ||
        profile?.currentSemester ||
        "Ø§Ù„ÙØµÙ„ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ",

      shortDescription:
        parsedEditableContent.blocks?.summaryIntro ||
        parsedEditableContent.blocks?.intro ||
        `ØªÙ‚Ø±ÙŠØ± ÙŠÙˆØ«Ù‚ ${report.caseEntry.service.name} Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø­Ø§Ù„Ø© ÙˆØ§Ù„Ø´ÙˆØ§Ù‡Ø¯ Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù‡Ø§.`,
    },

    sections,

    evidences,

    approval: {
      counselorName:
        report.caseEntry.createdBy?.name || "Ø§Ù„Ù…ÙˆØ¬Ù‡/Ø§Ù„Ù…ÙˆØ¬Ù‡Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ÙŠØ©",
      principalName: profile?.principalName || "Ù‚Ø§Ø¦Ø¯/Ù‚Ø§Ø¦Ø¯Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø©",
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
      title: "Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨/Ø§Ù„Ø·Ø§Ù„Ø¨Ø©",
      content: "",
      items: [
        {
          label: "Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨/Ø§Ù„Ø·Ø§Ù„Ø¨Ø©",
          value: student.fullName,
        },
        {
          label: "Ø±Ù‚Ù… Ø§Ù„Ù‡ÙˆÙŠØ©",
          value: student.nationalId || "ØºÙŠØ± Ù…ØªÙˆÙØ±",
        },
        {
          label: "Ø§Ù„Ù…Ø±Ø­Ù„Ø©",
          value: student.stage || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯",
        },
        {
          label: "Ø§Ù„ØµÙ",
          value: student.grade || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯",
        },
        {
          label: "Ø§Ù„ÙØµÙ„",
          value: student.classroom || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯",
        },
        {
          label: "ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±",
          value: guardian?.name || "ØºÙŠØ± Ù…ØªÙˆÙØ±",
        },
        {
          label: "Ø¬ÙˆØ§Ù„ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±",
          value: guardian?.phone || "ØºÙŠØ± Ù…ØªÙˆÙØ±",
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
      value: item.displayValue || "â€”",
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
      value: item.displayValue || "â€”",
    }));

  const sections: ReportSection[] = [];

  if (primaryItems.length) {
    sections.push({
      id: "workflow-primary",
      title: "Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬ ÙˆØ§Ù„ØªÙ†ÙÙŠØ°",
      content: "",
      items: primaryItems,
    });
  }

  if (otherItems.length) {
    sections.push({
      id: "workflow-extra",
      title: "Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ© Ù…Ù† Ø§Ù„Ø­Ø§Ù„Ø©",
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
    title: item.note || item.fileName || "Ø´Ø§Ù‡Ø¯",
    description: item.note || "",
    fileName: item.fileName || "Ù…Ø±ÙÙ‚",
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
    .replace(/[Ø£Ø¥Ø¢]/g, "Ø§")
    .replace(/Ù‰/g, "ÙŠ")
    .replace(/Ø©/g, "Ù‡")
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

