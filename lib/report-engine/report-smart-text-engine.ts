import type { ReportSection } from "@/lib/report-engine/report-types";

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

type TextTemplateContext = {
  serviceName: string;
  reportTitle: string;
  programTitle: string;
  executionDate: string;
  targetGroup: string;
  day: string;
  week: string;
  semester: string;
  action: string;
  mechanism: string;
  indicator: string;
  evidenceSuggestion: string;
  operation: string;
  evidenceCount: string;
  dayText: string;
  semesterWeekText: string;
};

const GUIDANCE_PROGRAM_TEXT_TEMPLATES = {
  intro:
    'تم إعداد هذا التقرير لتوثيق تنفيذ برنامج إرشادي بعنوان "{programTitle}" ضمن خدمة {serviceName}. وقد تم تنفيذ البرنامج بتاريخ {executionDate}{dayText}، مستهدفًا {targetGroup}. ويأتي هذا التنفيذ ضمن {semesterWeekText}.',

  execution:
    'تم تنفيذ البرنامج من خلال الإجراء التالي: "{action}". وتمت آلية التنفيذ عبر "{mechanism}". كما تم اعتماد مؤشر قياس الأداء التالي لمتابعة أثر التنفيذ: "{indicator}".',

  evidence:
    'تم توثيق تنفيذ البرنامج من خلال الشواهد والمرفقات المرتبطة بالحالة. وتشمل الشواهد المقترحة أو المستخدمة: "{evidenceSuggestion}". ويبلغ عدد الشواهد المرفقة في التقرير {evidenceCount}.',

  recommendation:
    "يوصى بالاستفادة من نتائج هذا البرنامج في متابعة أثره على الفئة المستهدفة، وتوثيق الملاحظات التطويرية، وربط الشواهد بنتائج التنفيذ بما يساعد على تحسين جودة البرامج الإرشادية القادمة.",
};

export function buildSmartReportTextSections(
  input: SmartReportTextInput
): ReportSection[] {
  const context = buildTemplateContext(input);

  const sections: ReportSection[] = [
    {
      id: "smart-intro",
      title: "وصف التقرير",
      content: renderTemplate(GUIDANCE_PROGRAM_TEXT_TEMPLATES.intro, context),
    },
    {
      id: "smart-execution",
      title: "ملخص التنفيذ",
      content: renderTemplate(
        GUIDANCE_PROGRAM_TEXT_TEMPLATES.execution,
        context
      ),
    },
    {
      id: "smart-evidence",
      title: "توثيق الشواهد",
      content: renderTemplate(GUIDANCE_PROGRAM_TEXT_TEMPLATES.evidence, context),
    },
    {
      id: "smart-recommendation",
      title: "توصية ختامية",
      content: renderTemplate(
        GUIDANCE_PROGRAM_TEXT_TEMPLATES.recommendation,
        context
      ),
    },
  ];

  return sections.filter((section) => {
    return typeof section.content === "string" && section.content.trim().length > 0;
  });
}

function buildTemplateContext(input: SmartReportTextInput): TextTemplateContext {
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

  const action = findValueByKeys(input.reportValues, [
    "execution_action",
    "action",
    "الإجراء",
    "الاجراء",
  ]);

  const mechanism = findValueByKeys(input.reportValues, [
    "execution_mechanism",
    "mechanism",
    "آلية",
    "الية",
  ]);

  const indicator = findValueByKeys(input.reportValues, [
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

  const finalDay = day || "";
  const finalWeek = week || "";
  const finalSemester = semester || "";

  const dayText = finalDay ? `، الموافق يوم ${finalDay}` : "";

  const semesterWeekText =
    finalSemester && finalWeek
      ? `${finalSemester}، ${finalWeek}`
      : finalSemester || finalWeek || "الخطة الزمنية المعتمدة";

  return {
    serviceName: input.serviceName || "الخدمة الإرشادية",
    reportTitle: input.reportTitle || "تقرير إرشادي",
    programTitle: input.programTitle || input.reportTitle || "برنامج إرشادي",
    executionDate: input.executionDate || "تاريخ غير محدد",
    targetGroup: input.targetGroup || "الفئة المستهدفة",
    day: finalDay,
    week: finalWeek,
    semester: finalSemester,
    action: action || "إجراء تنفيذي موثق",
    mechanism: mechanism || "آلية تنفيذ موثقة",
    indicator: indicator || "مؤشر قياس أداء",
    evidenceSuggestion: evidenceSuggestion || "الشواهد والمرفقات المرتبطة",
    operation: operation || "حفظ وتوثيق",
    evidenceCount:
      typeof input.evidenceCount === "number"
        ? `${input.evidenceCount} شاهد`
        : "الشواهد المرفقة",
    dayText,
    semesterWeekText,
  };
}

function renderTemplate(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    return context[key] || "";
  });
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