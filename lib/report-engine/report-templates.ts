import type {
  OfficialReportData,
  ReportTemplateDefinition,
  ReportTemplateFieldKey,
  ReportTemplateId,
} from "./report-types";

export const reportTemplates: ReportTemplateDefinition[] = [
  {
    id: "official-long",
    name: "القالب الرسمي المطوّل",
    description:
      "قالب رسمي متعدد الصفحات: غلاف، ملخص، محتوى، شواهد، واعتماد. مناسب للتقارير الطويلة.",
    bestFor: [
      "متابعة الطلبة والمواقف اليومية الطارئة",
      "اللجان والاجتماعات",
      "دراسة الحالة",
      "التقارير الرسمية",
    ],
    requiredFields: [
      "title",
      "serviceName",
      "reportDate",
      "cover.programTitle",
      "cover.executionDate",
      "sections",
    ],
    optionalFields: [
      "subtitle",
      "targetGroup",
      "evidences",
      "approval",
    ],
    defaultEvidenceLayout: "grid-2x2",
    supportsCoverPage: true,
  },
  {
    id: "visual-activity",
    name: "القالب البصري للبرامج والأنشطة",
    description:
      "قالب بصري خفيف يركز على العنوان والوصف والشواهد. مناسب للبرامج والأنشطة السريعة.",
    bestFor: [
      "برامج التوجيه الطلابي",
      "الأنشطة",
      "الحملات التوعوية",
      "المبادرات",
    ],
    requiredFields: [
      "title",
      "category",
      "reportDate",
      "cover.programTitle",
      "cover.shortDescription",
      "evidences",
    ],
    optionalFields: [
      "serviceName",
      "targetGroup",
      "cover.executionDate",
    ],
    defaultEvidenceLayout: "grid-2x2",
    supportsCoverPage: false,
  },
  {
    id: "executive-brief",
    name: "القالب التنفيذي المختصر",
    description:
      "قالب مختصر يعطي ملخصًا واضحًا مع أهم النتائج وشواهد محددة.",
    bestFor: [
      "تقرير مختصر",
      "تواصل الأسرة والمدرسة",
      "ملخص حالة",
      "تقرير سريع للإدارة",
    ],
    requiredFields: [
      "title",
      "serviceName",
      "reportDate",
      "sections",
    ],
    optionalFields: [
      "subtitle",
      "targetGroup",
      "evidences",
      "approval",
    ],
    defaultEvidenceLayout: "two-columns",
    supportsCoverPage: true,
  },
];

export function getReportTemplate(templateId: ReportTemplateId) {
  return (
    reportTemplates.find((template) => template.id === templateId) ||
    reportTemplates[0]
  );
}

export function getReportValue(
  report: OfficialReportData,
  key: ReportTemplateFieldKey
) {
  switch (key) {
    case "title":
      return report.title;
    case "subtitle":
      return report.subtitle;
    case "serviceName":
      return report.serviceName;
    case "category":
      return report.category;
    case "reportDate":
      return report.reportDate;
    case "targetGroup":
      return report.targetGroup;
    case "cover.programTitle":
      return report.cover.programTitle;
    case "cover.executionDate":
      return report.cover.executionDate;
    case "cover.shortDescription":
      return report.cover.shortDescription;
    case "sections":
      return report.sections?.length ? report.sections : null;
    case "evidences":
      return report.evidences?.length ? report.evidences : null;
    case "approval":
      return report.approval;
    default:
      return null;
  }
}

export function getMissingReportFields(
  report: OfficialReportData,
  templateId: ReportTemplateId
) {
  const template = getReportTemplate(templateId);

  return template.requiredFields.filter((field) => {
    const value = getReportValue(report, field);

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return !value;
  });
}