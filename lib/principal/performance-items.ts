export type PrincipalPerformanceItem = {
  slug: string;
  serviceSlug: string;
  title: string;
  shortTitle: string;
  description: string;
  href: string;
};

const PRINCIPAL_PERFORMANCE_BASE_PATH = "/dashboard/principal/performance";

function item(
  slug: string,
  serviceSlug: string,
  title: string,
  shortTitle: string,
): PrincipalPerformanceItem {
  return {
    slug,
    serviceSlug,
    title,
    shortTitle,
    description: `مساحة مدير المدرسة لتوثيق ${title} ومتابعة السجلات والتكليفات والتقارير المرتبطة به.`,
    href: `${PRINCIPAL_PERFORMANCE_BASE_PATH}/${slug}`,
  };
}

export const PRINCIPAL_PERFORMANCE_ITEMS = [
  item("job-duties", "principal-performance-job-duties", "أداء الواجبات الوظيفية", "الواجبات الوظيفية"),
  item("educational-community", "principal-performance-educational-community", "التعامل مع المجتمع التعليمي", "المجتمع التعليمي"),
  item("parents", "principal-performance-parents", "التعامل مع أولياء الأمور", "أولياء الأمور"),
  item("flexible-work", "principal-performance-flexible-work", "مرن وقادر على تنفيذ أعماله في ظل ظروف العمل المختلفة", "مرونة العمل"),
  item("quality-initiatives", "principal-performance-quality-initiatives", "يدعم ويتابع في المبادرات النوعية", "المبادرات النوعية"),
  item("school-discipline", "principal-performance-school-discipline", "يتخذ إجراءات تربوية تحقق الانضباط المدرسي", "الانضباط المدرسي"),
  item("resource-management", "principal-performance-resource-management", "يدير الموارد في المدرسة بكفاءة", "إدارة الموارد"),
  item("professional-development-plan", "principal-performance-professional-development-plan", "يعد خطة للتطوير المهني", "خطة التطوير المهني"),
  item("feedback-and-kpis", "principal-performance-feedback-and-kpis", "يقيم التغذية الراجعة ويتابع تحقيق مؤشرات الأداء الوظيفي", "التغذية الراجعة والمؤشرات"),
  item("professional-development-program", "principal-performance-professional-development-program", "يدعم تنفيذ برنامج التطوير المهني", "برنامج التطوير المهني"),
  item("staff-performance", "principal-performance-staff-performance", "يقيم أداء منسوبي المدرسة", "أداء المنسوبين"),
  item("learning-results", "principal-performance-learning-results", "ينفذ إجراءات علمية لتحسين نتائج التعلم", "تحسين نتائج التعلم"),
  item("school-performance", "principal-performance-school-performance", "يسهم في تحسين مستوى أداء المدرسة", "أداء المدرسة"),
  item("school-plans", "principal-performance-school-plans", "يعد الخطط المدرسية اللازمة", "الخطط المدرسية"),
  item("school-plans-follow-up", "principal-performance-school-plans-follow-up", "يتابع تنفيذ الخطط المدرسية بمختلف أنواعها", "متابعة الخطط"),
  item("student-innovation", "principal-performance-student-innovation", "يتيح الفرص والإمكانات لتنمية ابتكارات الطلاب في الأنشطة الصيفية وغير الصفية", "ابتكارات الطلاب"),
  item("learning-platform", "principal-performance-learning-platform", "يوظف المنصة التعليمية في عمليات التعليم والتعلم", "المنصة التعليمية"),
  item("positive-behavior", "principal-performance-positive-behavior", "يتابع تعزيز السلوك الإيجابي للطلاب", "السلوك الإيجابي"),
  item("safe-learning-environment", "principal-performance-safe-learning-environment", "يهيئ بيئة مدرسية آمنة ومحفزة على التعلم", "بيئة مدرسية آمنة"),
] as const satisfies readonly PrincipalPerformanceItem[];

export const PRINCIPAL_PERFORMANCE_WORKFLOW_SERVICES =
  PRINCIPAL_PERFORMANCE_ITEMS.map((performanceItem) => ({
    slug: performanceItem.serviceSlug,
    title: performanceItem.title,
    description: performanceItem.description,
    href: performanceItem.href,
    kind: "workflow" as const,
  }));

const itemBySlug = new Map(
  PRINCIPAL_PERFORMANCE_ITEMS.map((performanceItem) => [
    performanceItem.slug,
    performanceItem,
  ]),
);

const itemByServiceSlug = new Map(
  PRINCIPAL_PERFORMANCE_ITEMS.map((performanceItem) => [
    performanceItem.serviceSlug,
    performanceItem,
  ]),
);

export function getPrincipalPerformanceItem(slug: string) {
  return itemBySlug.get(String(slug || "").trim()) || null;
}

export function getPrincipalPerformanceItemByServiceSlug(serviceSlug: string) {
  return itemByServiceSlug.get(String(serviceSlug || "").trim()) || null;
}

export function isPrincipalPerformanceServiceSlug(serviceSlug: string) {
  return itemByServiceSlug.has(String(serviceSlug || "").trim());
}
