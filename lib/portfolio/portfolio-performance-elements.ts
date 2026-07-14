export type PortfolioPerformanceElement = {
  key: string;
  title: string;
  weight: number;
  serviceSlug: string;
  intro: string;
};

export const TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS: PortfolioPerformanceElement[] = [
  {
    key: "job_duties_performance",
    title: "أداء الواجبات الوظيفية",
    weight: 10,
    serviceSlug: "job_duties_performance",
    intro: "يعرض هذا القسم الشواهد والتقارير المرتبطة بأداء المهام والواجبات الوظيفية.",
  },
  {
    key: "professional_community_interaction",
    title: "التفاعل مع المجتمع المهني",
    weight: 10,
    serviceSlug: "professional_community_interaction",
    intro: "يعرض هذا القسم مشاركات التطوير المهني والتفاعل مع مجتمع التعلم.",
  },
  {
    key: "parents_interaction",
    title: "التفاعل مع أولياء الأمور",
    weight: 10,
    serviceSlug: "parents_interaction",
    intro: "يعرض هذا القسم تقارير التواصل والتعاون مع أولياء الأمور.",
  },
  {
    key: "teaching_strategies_diversity",
    title: "التنويع في استراتيجيات التدريس",
    weight: 10,
    serviceSlug: "teaching_strategies_diversity",
    intro: "يعرض هذا القسم تطبيقات التنويع في طرائق واستراتيجيات التدريس.",
  },
  {
    key: "learner_results_improvement",
    title: "تحسين نتائج المتعلمين",
    weight: 10,
    serviceSlug: "learner_results_improvement",
    intro: "يعرض هذا القسم الجهود المرتبطة برفع مستوى التحصيل وتحسين النتائج.",
  },
  {
    key: "learning_plan_preparation",
    title: "إعداد وتنفيذ خطة التعلم",
    weight: 10,
    serviceSlug: "learning_plan_preparation",
    intro: "يعرض هذا القسم خطط التعلم والتنفيذ والمتابعة.",
  },
  {
    key: "learning_technology_tools",
    title: "توظيف تقنيات ووسائل التعلم",
    weight: 10,
    serviceSlug: "learning_technology_tools",
    intro: "يعرض هذا القسم توظيف الأدوات التقنية والوسائل التعليمية.",
  },
  {
    key: "learning_environment",
    title: "تهيئة بيئة تعليمية",
    weight: 5,
    serviceSlug: "learning_environment",
    intro: "يعرض هذا القسم الشواهد المرتبطة بجودة البيئة التعليمية.",
  },
  {
    key: "classroom_management",
    title: "الإدارة الصفية",
    weight: 5,
    serviceSlug: "classroom_management",
    intro: "يعرض هذا القسم الشواهد المرتبطة بتنظيم وإدارة الصف.",
  },
  {
    key: "learner_results_analysis",
    title: "تحليل نتائج المتعلمين وتشخيص مستوياتهم",
    weight: 10,
    serviceSlug: "learner_results_analysis",
    intro: "يعرض هذا القسم تقارير التحليل والتشخيص ومؤشرات الأداء.",
  },
  {
    key: "assessment_methods_diversity",
    title: "تنوع أساليب التقويم",
    weight: 10,
    serviceSlug: "assessment_methods_diversity",
    intro: "يعرض هذا القسم شواهد التنوع في أدوات وأساليب التقويم.",
  },
];

export const TEACHER_PORTFOLIO_SERVICE_SLUGS = TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS.map(
  (item) => item.serviceSlug,
);

export function getTeacherPortfolioElementByServiceSlug(serviceSlug: string) {
  return TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS.find(
    (item) => item.serviceSlug === serviceSlug,
  );
}