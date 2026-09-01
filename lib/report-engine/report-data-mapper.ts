import { filterPrivateReportValues } from "@/lib/report-engine/report-private-fields";
import { filterValidReportEvidenceItems } from "@/lib/report-engine/report-evidence-utils";
import { getEvidencePresentationMode, getEvidenceSourceType, getVisibleEvidenceNote } from "@/lib/evidence/evidence-presentation";
import type {
  EvidenceLayout,
  OfficialReportData,
  ReportEvidence,
  ReportIdentity,
  ReportSection,
} from "@/lib/report-engine/report-types";

type CaseValueLike = {
  field?: {
    label?: string | null;
    name?: string | null;
    type?: string | null;
  } | null;
  value?: string | null;
};

type EvidenceLike = {
  id: string;
  title?: string | null;
  description?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  imageUrl?: string | null;
  publicUrl?: string | null;
  storagePath?: string | null;
  attachmentId?: string | null;
  url?: string | null;
  type?: string | null;
  mimeType?: string | null;
  note?: string | null;
};

type ServiceLike = {
  name?: string | null;
  title?: string | null;
  slug?: string | null;
};

type StudentLike = {
  fullName?: string | null;
  name?: string | null;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
};

type CaseEntryLike = {
  id: string;
  title?: string | null;
  status?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;

  service?: ServiceLike | null;
  student?: StudentLike | null;

  values?: CaseValueLike[];
  evidences?: EvidenceLike[];
};

type BuildReportInput = {
  caseEntry: CaseEntryLike;
  identity?: Partial<ReportIdentity>;
  evidenceLayout?: EvidenceLayout;
};

const DEFAULT_IDENTITY: ReportIdentity = {
  ministryLogoUrl: "/sample/report-evidence/ministry-logo.png",
  schoolLogoUrl: "/sample/report-evidence/square-evidence-1.png",

  ministryName: "وزارة التعليم",
  educationDepartment: "الإدارة العامة للتعليم بمنطقة جازان",
  educationOffice: "مكتب التعليم بفيفاء",
  schoolName: "اسم المدرسة",

  counselorName: "الموجه الطلابي",
  counselorTitle: "الموجه الطلابي",

  academicYear: "1447هـ",
  semester: "الفصل الدراسي الأول",
};

export function buildReportIdentity(
  identity?: Partial<ReportIdentity>
): ReportIdentity {
  return {
    ...DEFAULT_IDENTITY,
    ...identity,
  };
}

export function buildOfficialReportDataFromCase({
  caseEntry,
  identity,
  evidenceLayout = "grid-2x2",
}: BuildReportInput): {
  identity: ReportIdentity;
  report: OfficialReportData;
} {
  const finalIdentity = buildReportIdentity(identity);

  const serviceName =
    caseEntry.service?.name ||
    caseEntry.service?.title ||
    "خدمة إرشادية";

  const title =
    caseEntry.title ||
    getValueByPossibleLabels(caseEntry.values, [
      "عنوان البرنامج",
      "عنوان التقارير",
      "اسم البرنامج",
      "الموضوع",
    ]) ||
    `تقرير ${serviceName}`;

  const executionDate =
    getValueByPossibleLabels(caseEntry.values, [
      "تاريخ التنفيذ",
      "تاريخ التقارير",
      "تاريخ الجلسة",
      "تاريخ الاجتماع",
    ]) || formatArabicDate(caseEntry.createdAt);

  const targetGroup =
    getValueByPossibleLabels(caseEntry.values, [
      "الفئة المستهدفة",
      "المستفيدون",
      "الفئة",
      "الطلاب المستهدفون",
    ]) || buildStudentTarget(caseEntry.student);

  const shortDescription =
    getValueByPossibleLabels(caseEntry.values, [
      "وصف مختصر",
      "ملخص",
      "مقدمة",
      "وصف البرنامج",
      "تفاصيل التنفيذ",
    ]) || "تم إعداد هذا التقارير بناءً على البيانات المدخلة في المنصة والشواهد المرفقة.";

  const sections = buildReportSections(caseEntry.values);

  const evidences = buildReportEvidences(caseEntry.evidences);

  const report: OfficialReportData = {
    title: `تقرير ${serviceName}`,
    subtitle: title,

    serviceName,
    category: serviceName,
    reportDate: executionDate,
    targetGroup,

    cover: {
      programTitle: title,
      executionDate,
      schoolYear: finalIdentity.academicYear,
      semester: finalIdentity.semester,
      shortDescription,
    },

    sections,

    evidences,
    evidenceLayout,

    approval: {
      counselorName: finalIdentity.counselorName,
      principalName: "قائد/قائدة المدرسة",
      date: executionDate,
    },
  };

  return {
    identity: finalIdentity,
    report,
  };
}

function buildReportSections(values?: CaseValueLike[]): ReportSection[] {
  values = filterPrivateReportValues(values || []);
  const safeValues = values || [];

  const intro =
    getValueByPossibleLabels(safeValues, [
      "مقدمة",
      "وصف البرنامج",
      "تفاصيل التنفيذ",
      "ملخص",
    ]) || "لا توجد مقدمة مدخلة.";

  const goalsItems = getItemsByKeywords(safeValues, [
    "هدف",
    "الأهداف",
    "اهداف",
  ]);

  const procedures =
    getValueByPossibleLabels(safeValues, [
      "إجراءات التنفيذ",
      "الاجراءات",
      "ما تم تنفيذه",
      "آلية التنفيذ",
    ]) || "لم يتم إدخال إجراءات تنفيذ مفصلة.";

  const results =
    getValueByPossibleLabels(safeValues, [
      "النتائج",
      "التوصيات",
      "نتيجة التنفيذ",
      "الأثر",
    ]) || "لم يتم إدخال نتائج أو توصيات مفصلة.";

  const sections: ReportSection[] = [
    {
      id: "intro",
      title: "مقدمة التقارير",
      content: intro,
    },
  ];

  if (goalsItems.length) {
    sections.push({
      id: "goals",
      title: "أهداف البرنامج",
      items: goalsItems.map((value, index) => ({
        label: `الهدف ${toArabicOrdinal(index + 1)}`,
        value,
      })),
    });
  } else {
    sections.push({
      id: "goals",
      title: "أهداف البرنامج",
      items: [
        {
          label: "الهدف الأول",
          value: "توثيق تنفيذ الخدمة الإرشادية وفق البيانات المدخلة.",
        },
      ],
    });
  }

  sections.push(
    {
      id: "procedures",
      title: "إجراءات التنفيذ",
      content: procedures,
    },
    {
      id: "results",
      title: "النتائج والتوصيات",
      content: results,
    }
  );

  return sections;
}

function buildReportEvidences(evidences?: EvidenceLike[]): ReportEvidence[] {
  const safeEvidences = filterValidReportEvidenceItems(evidences || []);

  return safeEvidences.map((evidence, index) => ({
    id: evidence.id || `evidence-${index + 1}`,
    title: evidence.title || getVisibleEvidenceNote(evidence.note) || `شاهد ${index + 1}`,
    description: evidence.description || undefined,
    fileName: evidence.fileName || undefined,
    fileUrl: evidence.fileUrl || evidence.url || evidence.imageUrl || evidence.publicUrl || evidence.storagePath || undefined,
    url: evidence.url || undefined,
    sourceType: getEvidenceSourceType(evidence),
    presentationMode: getEvidencePresentationMode(evidence),
    imageUrl: getEvidencePresentationMode(evidence) === "IMAGE"
      ? evidence.fileUrl || evidence.url || evidence.imageUrl || evidence.publicUrl || evidence.storagePath || undefined
      : undefined,
  }));
}

function getValueByPossibleLabels(
  values: CaseValueLike[] | undefined,
  labels: string[]
) {
  const safeValues = values || [];

  const found = safeValues.find((item) => {
    const label = normalizeArabic(item.field?.label || "");
    const name = normalizeArabic(item.field?.name || "");

    return labels.some((possibleLabel) => {
      const normalizedPossibleLabel = normalizeArabic(possibleLabel);

      return (
        label.includes(normalizedPossibleLabel) ||
        name.includes(normalizedPossibleLabel)
      );
    });
  });

  return normalizeValue(found?.value);
}

function getItemsByKeywords(
  values: CaseValueLike[] | undefined,
  keywords: string[]
) {
  const safeValues = values || [];

  return safeValues
    .filter((item) => {
      const label = normalizeArabic(item.field?.label || "");
      const name = normalizeArabic(item.field?.name || "");

      return keywords.some((keyword) => {
        const normalizedKeyword = normalizeArabic(keyword);

        return (
          label.includes(normalizedKeyword) ||
          name.includes(normalizedKeyword)
        );
      });
    })
    .map((item) => normalizeValue(item.value))
    .filter((value): value is string => Boolean(value));
}

function normalizeArabic(value: string) {
  return value
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeValue(value?: string | null) {
  if (!value) return undefined;

  const cleanValue = String(value).trim();

  if (!cleanValue || cleanValue === "null" || cleanValue === "undefined") {
    return undefined;
  }

  return cleanValue;
}

function buildStudentTarget(student?: StudentLike | null) {
  if (!student) return "غير محدد";

  const name = student.fullName || student.name;
  const grade = student.grade;
  const classroom = student.classroom;

  return [name, grade, classroom].filter(Boolean).join(" - ") || "غير محدد";
}

function formatArabicDate(date?: Date | string | null) {
  if (!date) {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  const dateObject = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(dateObject.getTime())) {
    return String(date);
  }

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateObject);
}

function toArabicOrdinal(index: number) {
  const values: Record<number, string> = {
    1: "الأول",
    2: "الثاني",
    3: "الثالث",
    4: "الرابع",
    5: "الخامس",
    6: "السادس",
    7: "السابع",
    8: "الثامن",
    9: "التاسع",
    10: "العاشر",
  };

  return values[index] || String(index);
}
