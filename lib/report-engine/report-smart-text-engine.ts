import type { ReportSection } from "@/lib/report-engine/report-types";
import {
  renderSmartTemplate,
  resolveSmartTextTemplateSet,
  type SmartTextVariableMap,
} from "@/lib/report-engine/report-smart-text-library";

export type SmartReportValue = {
  fieldKey: string;
  fieldLabel: string;
  displayValue: string;
};

export type SmartReportTextInput = {
  serviceName: string;
  reportTitle: string;
  programTitle: string;
  executionDate: string;
  targetGroup: string;
  reportValues: SmartReportValue[];
  evidenceCount?: number;
};

export function buildSmartReportTextSections(
  input: SmartReportTextInput
): ReportSection[] {
  const variables = buildSmartTextVariables(input);
  const templateSet = resolveSmartTextTemplateSet(input.serviceName);

  return templateSet.sections
    .filter((template) => {
      if (!template.when) return true;
      return template.when(variables);
    })
    .map((template) => ({
      id: template.id,
      title: template.title,
      content: renderSmartTemplate(template.body, variables),
    }))
    .filter((section) => {
      return typeof section.content === "string" && section.content.trim().length > 0;
    });
}

export function buildSmartTextVariables(
  input: SmartReportTextInput
): SmartTextVariableMap {
  const day = findValueByKeys(input.reportValues, ["day", "اليوم"]);

  const week = findValueByKeys(input.reportValues, [
    "week",
    "الأسبوع",
    "الاسبوع",
  ]);

  const semester = findValueByKeys(input.reportValues, [
    "semester",
    "الفصل",
    "الفصل الدراسي",
  ]);

  const executionAction = findValueByKeys(input.reportValues, [
    "execution_action",
    "action",
    "الإجراء",
    "الاجراء",
  ]);

  const executionMechanism = findValueByKeys(input.reportValues, [
    "execution_mechanism",
    "mechanism",
    "آلية",
    "الية",
  ]);

  const performanceIndicator = findValueByKeys(input.reportValues, [
    "performance_indicator",
    "indicator",
    "مؤشر",
    "قياس",
  ]);

  const evidenceSuggestion = findValueByKeys(input.reportValues, [
    "evidence_suggestion",
    "evidence",
    "الشاهد",
    "الشواهد",
  ]);

  const operation = findValueByKeys(input.reportValues, [
    "operation",
    "العمليات",
    "العملية",
  ]);

  const semesterWeekText =
    semester && week
      ? `${semester}، ${week}`
      : semester || week || "الخطة الزمنية المعتمدة";

  const dayText = day ? `، الموافق يوم ${day}` : "";

  return {
    serviceName: cleanText(input.serviceName) || "الخدمة الإرشادية",
    reportTitle: cleanText(input.reportTitle) || "تقرير إرشادي",
    programTitle:
      cleanText(input.programTitle) ||
      cleanText(input.reportTitle) ||
      "برنامج إرشادي",

    executionDate: cleanText(input.executionDate) || "تاريخ غير محدد",
    targetGroup: cleanText(input.targetGroup) || "الفئة المستهدفة",

    day,
    week,
    semester,
    dayText,
    semesterWeekText,

    executionAction: executionAction || "إجراء تنفيذي موثق",
    executionMechanism: executionMechanism || "آلية تنفيذ موثقة",
    performanceIndicator,
    evidenceSuggestion: evidenceSuggestion || "الشواهد والمرفقات المرتبطة",
    operation: operation || "حفظ وتوثيق",

    evidenceCountText: formatEvidenceCount(input.evidenceCount),
  };
}

function findValueByKeys(items: SmartReportValue[], keys: string[]) {
  const normalizedKeys = keys.map(normalizeSearchText);

  const found = items.find((item) => {
    const key = normalizeSearchText(item.fieldKey);
    const label = normalizeSearchText(item.fieldLabel);

    return normalizedKeys.some(
      (target) => key.includes(target) || label.includes(target)
    );
  });

  return cleanText(found?.displayValue || "");
}

function formatEvidenceCount(count?: number) {
  if (typeof count !== "number") {
    return "الشواهد المتاحة";
  }

  if (count <= 0) {
    return "0 شاهد";
  }

  if (count === 1) {
    return "شاهد واحد";
  }

  if (count === 2) {
    return "شاهدان";
  }

  if (count >= 3 && count <= 10) {
    return `${count} شواهد`;
  }

  return `${count} شاهد`;
}

function cleanText(value?: string | null) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
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