import type {
  SpecialReportCustomFieldConfig,
  SpecialReportCustomFieldOption,
  SpecialReportFieldDefinition,
  SpecialReportFieldOption,
  SpecialReportFieldType,
} from "@/lib/special-report/types";

export const SPECIAL_REPORT_REPEATABLE_FIELD_KEYS = [
  "special_report_objectives",
  "special_report_tools",
  "special_report_results_outputs",
  "special_report_evaluation_indicators",
  "special_report_recommendations",
  "special_report_roles_responsibilities",
  "special_report_challenges",
] as const;

export const SPECIAL_REPORT_AI_DISABLED_FIELD_KEYS = [
  ...SPECIAL_REPORT_REPEATABLE_FIELD_KEYS,
] as const;

export const SPECIAL_REPORT_PERFORMANCE_ELEMENTS = [
  "أداء الواجبات الوظيفية",
  "التفاعل مع المجتمع المهني",
  "التفاعل مع أولياء الأمور",
  "التنويع في استراتيجيات التدريس",
  "تحسين نتائج المتعلمين",
  "إعداد وتنفيذ خطة التعلم",
  "توظيف تقنيات ووسائل التعلم المناسبة",
  "تهيئة بيئة تعليمية",
  "الإدارة الصفية",
  "تحليل نتائج المتعلمين وتشخيص مستوياتهم",
  "تنوع أساليب التقويم",
] as const;

export type SpecialReportPerformanceElement =
  (typeof SPECIAL_REPORT_PERFORMANCE_ELEMENTS)[number];

function createOptions(values: string[]): SpecialReportFieldOption[] {
  return values.map((label, index) => ({
    label,
    value: `option_${index + 1}`,
    order: index + 1,
  }));
}

const TARGET_AUDIENCE_OPTIONS = createOptions([
  "الطلاب",
  "الطالبات",
  "المعلمون",
  "المعلمات",
  "أولياء الأمور",
  "المجتمع المدرسي",
]);

const TOOLS_OPTIONS = createOptions([
  "عروض تقديمية",
  "أوراق عمل",
  "منصات رقمية",
  "أجهزة عرض",
  "أنشطة تطبيقية",
  "وسائل تعليمية",
]);

const GRADE_OPTIONS = createOptions([
  "الأول الابتدائي",
  "الثاني الابتدائي",
  "الثالث الابتدائي",
  "الرابع الابتدائي",
  "الخامس الابتدائي",
  "السادس الابتدائي",
  "الأول المتوسط",
  "الثاني المتوسط",
  "الثالث المتوسط",
  "الأول الثانوي",
  "الثاني الثانوي",
  "الثالث الثانوي",
]);

export const SPECIAL_REPORT_FIELD_BANK: SpecialReportFieldDefinition[] = [
  {
    key: "special_report_title",
    label: "عنوان التقرير",
    type: "TEXT",
    isRequired: true,
    fixed: true,
    placeholder: "اكتب عنوان التقرير",
  },

  {
    key: "special_report_execution_date",
    label: "تاريخ التنفيذ",
    type: "DATE",
    isRequired: true,
    fixed: true,
  },

  {
    key: "special_report_objectives",
    label: "الأهداف",
    type: "TEXT",
    isRequired: false,
    fixed: false,
    isRepeater: true,
    placeholder: "اكتب الهدف",
  },

  {
    key: "special_report_execution_procedures",
    label: "إجراءات التنفيذ",
    type: "TEXTAREA",
    isRequired: false,
    fixed: false,
    placeholder: "اكتب إجراءات التنفيذ",
  },

  {
    key: "special_report_target_audience",
    label: "الفئة المستهدفة",
    type: "SELECT",
    isRequired: false,
    fixed: false,
    allowOther: true,
    options: TARGET_AUDIENCE_OPTIONS,
  },

  {
    key: "special_report_tools",
    label: "الأدوات والوسائل",
    type: "TEXT",
    isRequired: false,
    fixed: false,
    isRepeater: true,
    placeholder: "اكتب الأداة أو الوسيلة",
    helpText:
      "أضف الأدوات والوسائل عنصرًا بعنصر. مثال: عرض تقديمي، ورقة عمل، منصة رقمية.",
  },

  {
    key: "special_report_results_outputs",
    label: "النتائج والمخرجات",
    type: "TEXT",
    isRequired: false,
    fixed: false,
    isRepeater: true,
    placeholder: "اكتب النتيجة أو المخرج",
  },

  {
    key: "special_report_evaluation_indicators",
    label: "مؤشرات التقويم",
    type: "TEXT",
    isRequired: false,
    fixed: false,
    isRepeater: true,
    placeholder: "اكتب مؤشر التقويم",
  },

  {
    key: "special_report_recommendations",
    label: "التوصيات",
    type: "TEXT",
    isRequired: false,
    fixed: false,
    isRepeater: true,
    placeholder: "اكتب التوصية",
  },

  {
    key: "special_report_roles_responsibilities",
    label: "الأدوار والمسؤوليات",
    type: "TEXT",
    isRequired: false,
    fixed: false,
    isRepeater: true,
    placeholder: "اكتب الدور أو المسؤولية",
  },

  {
    key: "special_report_challenges",
    label: "التحديات",
    type: "TEXT",
    isRequired: false,
    fixed: false,
    isRepeater: true,
    placeholder: "اكتب التحدي",
  },

  {
    key: "special_report_grade",
    label: "الصف",
    type: "SELECT",
    isRequired: false,
    fixed: false,
    allowOther: true,
    options: GRADE_OPTIONS,
  },

  {
    key: "special_report_subject",
    label: "المادة",
    type: "TEXT",
    isRequired: false,
    fixed: false,
    placeholder: "اكتب اسم المادة",
  },

  {
    key: "special_report_location",
    label: "مكان التنفيذ",
    type: "TEXT",
    isRequired: false,
    fixed: false,
    placeholder: "اكتب مكان التنفيذ",
  },

  {
    key: "special_report_lesson_topic",
    label: "موضوع الدرس",
    type: "TEXT",
    isRequired: false,
    fixed: false,
    placeholder: "اكتب موضوع الدرس",
  },
];

export const SPECIAL_REPORT_FIXED_FIELD_KEYS = [
  "special_report_title",
  "special_report_execution_date",
] as const;

export const SPECIAL_REPORT_CUSTOM_KEY_PREFIX = "special_report_custom_";

const SPECIAL_REPORT_CUSTOM_KEY_PATTERN = /^special_report_custom_[a-z0-9]+$/;
const SPECIAL_REPORT_CUSTOM_FIELD_TYPES: SpecialReportFieldType[] = [
  "TEXT",
  "TEXTAREA",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
];

export function isValidSpecialReportCustomFieldKey(key: string) {
  return SPECIAL_REPORT_CUSTOM_KEY_PATTERN.test(key);
}

export function validateSpecialReportCustomFields(
  customFields: SpecialReportCustomFieldConfig[] = [],
) {
  const catalogKeys = new Set(SPECIAL_REPORT_FIELD_BANK.map((field) => field.key));
  const keys = new Set<string>();

  for (const field of customFields) {
    const key = String(field.key || "").trim();
    const label = String(field.label || "").trim();

    if (!key || !isValidSpecialReportCustomFieldKey(key)) {
      throw new Error("مفتاح الحقل المخصص غير صالح.");
    }
    if (catalogKeys.has(key) || keys.has(key)) {
      throw new Error("يوجد تكرار في مفاتيح الحقول المخصصة.");
    }
    if (!label) {
      throw new Error("يجب إدخال عنوان للحقل المخصص.");
    }
    if (!SPECIAL_REPORT_CUSTOM_FIELD_TYPES.includes(field.type)) {
      throw new Error("نوع الحقل المخصص غير مدعوم.");
    }
    if (field.isRepeater && (field.type === "DATE" || field.type === "MULTI_SELECT")) {
      throw new Error("لا يمكن تفعيل التكرار لهذا النوع من الحقول.");
    }

    const needsOptions = field.type === "SELECT" || field.type === "MULTI_SELECT";
    const options = Array.isArray(field.options) ? field.options : [];
    if (needsOptions) {
      if (!options.length) throw new Error("أضف خيارًا واحدًا على الأقل.");
      const optionValues = new Set<string>();
      for (const option of options) {
        const optionLabel = String(option.label || "").trim();
        const optionValue = String(option.value || "").trim();
        if (!optionLabel || !optionValue) throw new Error("لا يمكن ترك خيارات الحقل فارغة.");
        if (optionValues.has(optionValue)) throw new Error("توجد قيم خيارات مكررة.");
        optionValues.add(optionValue);
      }
    }
    keys.add(key);
  }

  return customFields;
}

export function resolveSpecialReportRuntimeFields(
  fieldKeys: string[],
  customFields: SpecialReportCustomFieldConfig[] = [],
): Array<SpecialReportFieldDefinition | SpecialReportCustomFieldConfig> {
  validateSpecialReportCustomFields(customFields);
  const customByKey = new Map(customFields.map((field) => [field.key, field]));
  const catalogByKey = new Map(SPECIAL_REPORT_FIELD_BANK.map((field) => [field.key, field]));
  const seen = new Set<string>();

  const orderedKeys = fieldKeys;

  return orderedKeys
    .map((key) => {
      if (seen.has(key)) return null;
      seen.add(key);
      return catalogByKey.get(key) || customByKey.get(key) || null;
    })
    .filter(
      (field): field is SpecialReportFieldDefinition | SpecialReportCustomFieldConfig =>
        field !== null,
    );
}

export function isValidPerformanceElement(
  value: string
): value is SpecialReportPerformanceElement {
  return SPECIAL_REPORT_PERFORMANCE_ELEMENTS.includes(
    value as SpecialReportPerformanceElement
  );
}

export function isSpecialReportRepeaterFieldKey(key: string) {
  return SPECIAL_REPORT_REPEATABLE_FIELD_KEYS.includes(
    key as (typeof SPECIAL_REPORT_REPEATABLE_FIELD_KEYS)[number]
  );
}

export function isSpecialReportAiDisabledFieldKey(key: string) {
  return SPECIAL_REPORT_AI_DISABLED_FIELD_KEYS.includes(
    key as (typeof SPECIAL_REPORT_AI_DISABLED_FIELD_KEYS)[number]
  );
}

export function getSpecialReportField(
  key: string
): SpecialReportFieldDefinition | null {
  return (
    SPECIAL_REPORT_FIELD_BANK.find((field) => field.key === key) ?? null
  );
}

export function normalizeSpecialReportFieldKeys(
  inputKeys: string[],
  customKeys: string[] = [],
): string[] {
  const validKeys = new Set(
    [...SPECIAL_REPORT_FIELD_BANK.map((field) => field.key), ...customKeys]
  );

  const flexibleKeys = inputKeys.filter((key, index) => {
    if (!validKeys.has(key)) {
      return false;
    }

    if (
      SPECIAL_REPORT_FIXED_FIELD_KEYS.includes(
        key as (typeof SPECIAL_REPORT_FIXED_FIELD_KEYS)[number]
      )
    ) {
      return false;
    }

    return inputKeys.indexOf(key) === index;
  });

  return flexibleKeys;
}

export function resolveSpecialReportFields(
  inputKeys: string[]
): SpecialReportFieldDefinition[] {
  return normalizeSpecialReportFieldKeys(inputKeys)
    .map((key) => getSpecialReportField(key))
    .filter(
      (field): field is SpecialReportFieldDefinition =>
        field !== null
    );
}
