import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import { ReportDocumentRenderer } from "@/components/report-engine/report-document-renderer";
import type {
  EvidenceLayout,
  OfficialReportData,
  ReportEvidence,
  ReportIdentity,
  ReportSection,
  ReportTemplateId,
} from "@/lib/report-engine/report-types";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<{
    template?: string;
    evidenceLayout?: string;
    cover?: string;
    editorial?: string;
    studio?: string;
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

export default async function ReportRealPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { reportId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const studioMode = resolvedSearchParams.studio === "true";
  const showCover = resolvedSearchParams.cover !== "false";

  const selectedTemplate = resolveTemplateId(
    resolvedSearchParams.template || reportId
  );

  const selectedEvidenceLayout = resolveEvidenceLayout(
    resolvedSearchParams.evidenceLayout
  );

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
          student: {
            include: {
              guardian: true,
            },
          },
          values: {
            include: {
              field: true,
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

  const parsedEditableContent = parseEditableContent(report.editableContent);
  const workflowValueOverrides =
    parsedEditableContent.workflowValueOverrides || [];

  const reportValues = buildReportValues(
    report.caseEntry.values,
    workflowValueOverrides
  );

  const identity = buildReportIdentity(report);
  const officialReport = buildOfficialReportData({
    report,
    reportValues,
    parsedEditableContent,
    evidenceLayout: selectedEvidenceLayout,
  });

  return (
    <main
      dir="rtl"
      className={
        studioMode
          ? "min-h-screen bg-slate-100 py-5"
          : "min-h-screen bg-slate-100 px-6 py-6"
      }
    >
      {!studioMode ? (
        <PreviewToolbar
          reportId={report.id}
          title={report.title}
          serviceName={report.caseEntry.service.name}
          selectedTemplate={selectedTemplate}
          selectedEvidenceLayout={selectedEvidenceLayout}
          showCover={showCover}
        />
      ) : null}

      <section className={studioMode ? "mx-auto" : "mx-auto max-w-[260mm]"}>
        <ReportDocumentRenderer
          identity={identity}
          report={officialReport}
          templateId={selectedTemplate}
          showCover={showCover}
          evidenceLayout={selectedEvidenceLayout}
        />
      </section>
    </main>
  );
}

function PreviewToolbar({
  reportId,
  title,
  serviceName,
  selectedTemplate,
  selectedEvidenceLayout,
  showCover,
}: {
  reportId: string;
  title: string;
  serviceName: string;
  selectedTemplate: ReportTemplateId;
  selectedEvidenceLayout: EvidenceLayout;
  showCover: boolean;
}) {
  return (
    <section className="mx-auto mb-6 flex max-w-[260mm] flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-black text-sky-700">معاينة التقرير الحقيقية</p>

        <h1 className="mt-2 text-2xl font-black text-slate-900">{title}</h1>

        <p className="mt-1 text-sm text-slate-500">
          {serviceName} — قالب: {getTemplateName(selectedTemplate)} — الشواهد:{" "}
          {getEvidenceLayoutName(selectedEvidenceLayout)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/reports/${reportId}/studio`}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
        >
          تعديل التقرير
        </Link>

        <button
          type="button"
          onClick={undefined}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 print:hidden"
        >
          استخدم Ctrl + P للطباعة
        </button>

        <Link
          href={`/dashboard/reports/${reportId}/preview?template=${selectedTemplate}&evidenceLayout=${selectedEvidenceLayout}&cover=${showCover ? "false" : "true"}`}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
        >
          {showCover ? "إخفاء الغلاف" : "إظهار الغلاف"}
        </Link>

        <Link
          href="/dashboard/reports"
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
        >
          الرجوع للتقارير
        </Link>
      </div>
    </section>
  );
}

function buildReportIdentity(report: NonNullable<Awaited<ReturnType<typeof getReportForTypeOnly>>>) {
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
      report.caseEntry.createdBy?.name ||
      report.approvalSnapshot?.counselorName ||
      "الموجه/الموجهة الطلابية",
    principalName: profile?.principalName || "قائد/قائدة المدرسة",
    academicYear: profile?.academicYear || "العام الدراسي",
    semester: profile?.currentSemester || "الفصل الدراسي",
    schoolLogoUrl: undefined,
    ministryLogoUrl: undefined,
  } satisfies ReportIdentity;
}

function buildOfficialReportData({
  report,
  reportValues,
  parsedEditableContent,
  evidenceLayout,
}: {
  report: NonNullable<Awaited<ReturnType<typeof getReportForTypeOnly>>>;
  reportValues: ReportValueItem[];
  parsedEditableContent: EditableContentPayload;
  evidenceLayout: EvidenceLayout;
}) {
  const student = report.caseEntry.student;
  const guardian = student?.guardian;
  const profile = report.caseEntry.schoolAccount.profile;

  const editableSections = buildEditableSections(parsedEditableContent);
  const workflowSections = buildWorkflowSections(reportValues);

  const sections: ReportSection[] = [
    ...editableSections,
    ...workflowSections,
  ].filter(Boolean);

  const evidences = buildReportEvidences(report);

  const reportDate = formatDate(report.generatedAt || report.createdAt);
  const executionDate =
    findValueByKeys(reportValues, [
      "date",
      "execution_date",
      "program_date",
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
    student: student
      ? {
          name: student.fullName,
          nationalId: student.nationalId || "غير متوفر",
          stage: student.stage || "غير محدد",
          grade: student.grade || "غير محدد",
          classroom: student.classroom || "غير محدد",
          guardianName: guardian?.name || "غير متوفر",
          guardianPhone: guardian?.phone || "غير متوفر",
        }
      : undefined,
  } satisfies OfficialReportData;
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
    "beneficiaries",
    "execution_action",
    "execution_mechanism",
    "performance_indicator",
    "recommendations",
    "notes",
  ];

  const primaryItems = reportValues
    .filter((item) =>
      importantKeys.some((key) =>
        item.fieldKey.toLowerCase().includes(key.toLowerCase())
      )
    )
    .map((item) => ({
      label: item.fieldLabel,
      value: item.displayValue || "—",
    }));

  const otherItems = reportValues
    .filter(
      (item) =>
        !importantKeys.some((key) =>
          item.fieldKey.toLowerCase().includes(key.toLowerCase())
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

function buildReportEvidences(
  report: NonNullable<Awaited<ReturnType<typeof getReportForTypeOnly>>>
): ReportEvidence[] {
  const reportEvidenceItems = report.evidenceItems.map((item) => ({
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

  return report.caseEntry.evidences.map((item) => ({
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

  return values.map((item, index) => {
    const fieldKey = item.field?.key || item.fieldKey || item.id;
    const fieldLabel =
      item.field?.label || item.fieldKey || `قيمة رقم ${index + 1}`;

    const originalValue = stringifyValue(item.value ?? item.jsonValue);

    const override =
      overrideMap.get(fieldKey) ||
      overrideMap.get(fieldLabel) ||
      overrideMap.get(item.fieldKey || "");

    const displayValue = override?.editedValue ?? originalValue;

    return {
      fieldKey,
      fieldLabel,
      originalValue,
      displayValue,
      isChanged: Boolean(
        override && override.editedValue.trim() !== originalValue.trim()
      ),
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

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).filter(Boolean).join("، ");
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
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

function getTemplateName(templateId?: string | null) {
  if (templateId === "visual-activity") return "القالب البصري";
  if (templateId === "executive-brief") return "القالب المختصر";
  if (templateId === "official-long") return "القالب الرسمي";
  return "القالب الرسمي";
}

function getEvidenceLayoutName(layout: EvidenceLayout) {
  if (layout === "one-per-page") return "شاهد في كل صفحة";
  if (layout === "single-large") return "شاهد كبير";
  if (layout === "stacked") return "شاهدان فوق بعض";
  if (layout === "two-columns") return "عمودان";
  if (layout === "grid-2x2") return "شبكة 2×2";
  return "تلقائي";
}

/**
 * هذه الدالة لا تُستدعى فعليًا.
 * الهدف منها فقط استخراج نوع التقرير الناتج من Prisma include بدون كتابة نوع ضخم يدويًا.
 */
async function getReportForTypeOnly() {
  return prisma.guidanceReport.findUnique({
    where: {
      id: "__type_only__",
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
          student: {
            include: {
              guardian: true,
            },
          },
          values: {
            include: {
              field: true,
            },
          },
          evidences: true,
        },
      },
      evidenceItems: true,
    },
  });
}