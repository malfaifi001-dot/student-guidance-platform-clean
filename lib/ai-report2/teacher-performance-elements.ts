export const TEACHER_PERFORMANCE_ELEMENTS = [
  {
    code: "learning_plan_preparation",
    label: "إعداد وتنفيذ خطة التعلم",
    keywords: ["خطة التعلم", "خطة درس", "تحضير", "نواتج التعلم", "أهداف الدرس", "تنفيذ الخطة"],
  },
  {
    code: "teaching_strategies_diversity",
    label: "التنويع في استراتيجيات التدريس",
    keywords: ["استراتيجية", "استراتيجيات", "تعلم نشط", "تدريس", "تعلم تعاوني", "عصف ذهني", "حل مشكلات"],
  },
  {
    code: "assessment_methods_diversity",
    label: "تنوع أساليب التقويم",
    keywords: ["تقويم", "اختبار", "واجب", "بطاقة خروج", "ملاحظة", "سلم تقدير", "أداة تقويم"],
  },
  {
    code: "classroom_management",
    label: "الإدارة الصفية",
    keywords: ["إدارة صفية", "سلوك", "انضباط", "غياب", "تأخر", "مشاركة صفية", "تنظيم الصف"],
  },
  {
    code: "learning_technology_tools",
    label: "توظيف تقنيات ووسائل التعلم المناسبة",
    keywords: ["تقنية", "منصة", "مدرستي", "أداة رقمية", "وسائل تعلم", "عرض مرئي", "تطبيق"],
  },
  {
    code: "learner_results_analysis",
    label: "تحليل نتائج المتعلمين وتشخيص مستوياتهم",
    keywords: ["تحليل نتائج", "تشخيص", "اختبار", "درجات", "مستويات", "فجوات", "إتقان"],
  },
  {
    code: "learner_results_improvement",
    label: "تحسين نتائج المتعلمين",
    keywords: ["تحسين النتائج", "خطة علاجية", "خطة إثرائية", "رفع المستوى", "تعثر", "دعم", "تحسن"],
  },
  {
    code: "parents_interaction",
    label: "التفاعل مع أولياء الأمور",
    keywords: ["ولي أمر", "أولياء الأمور", "تواصل", "رسالة", "اتصال", "اجتماع ولي"],
  },
  {
    code: "professional_community_interaction",
    label: "التفاعل مع المجتمع المهني والشراكة المجتمعية",
    keywords: ["مجتمع مهني", "ورشة", "زملاء", "مشرف", "شراكة", "مجتمعية", "تبادل خبرات"],
  },
  {
    code: "job_duties_performance",
    label: "أداء الواجبات الوظيفية",
    keywords: ["واجب وظيفي", "حصة انتظار", "مناوبة", "تكليف", "متابعة", "التزام", "مهام"],
  },
  {
    code: "learning_environment",
    label: "تهيئة بيئة تعليمية",
    keywords: ["بيئة تعليمية", "تحفيز", "تكريم", "قيم", "صحة", "جودة الحياة", "مناسبة", "اليوم الوطني"],
  },
] as const;

export type TeacherPerformanceElementCode =
  (typeof TEACHER_PERFORMANCE_ELEMENTS)[number]["code"];

export type TeacherPerformanceElementScope =
  | TeacherPerformanceElementCode
  | "auto";

export const TEACHER_PERFORMANCE_ELEMENT_OPTIONS = [
  { code: "auto", label: "يحدد تلقائيًا" },
  ...TEACHER_PERFORMANCE_ELEMENTS.map((item) => ({
    code: item.code,
    label: item.label,
  })),
] as const;

export function normalizeTeacherPerformanceElementScope(
  value: unknown,
): TeacherPerformanceElementScope {
  const raw = String(value ?? "").trim();

  if (!raw || raw === "auto") {
    return "auto";
  }

  const match = TEACHER_PERFORMANCE_ELEMENTS.find(
    (item) => item.code === raw || item.label === raw,
  );

  return match?.code || "auto";
}

export function getTeacherPerformanceElement(
  value: unknown,
) {
  const scope = normalizeTeacherPerformanceElementScope(value);

  if (scope === "auto") {
    return null;
  }

  return (
    TEACHER_PERFORMANCE_ELEMENTS.find((item) => item.code === scope) || null
  );
}

export function teacherPerformanceElementLabel(value: unknown) {
  return getTeacherPerformanceElement(value)?.label || "يحدد تلقائيًا";
}