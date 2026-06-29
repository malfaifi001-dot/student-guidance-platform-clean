export type TeacherPerformanceService = {
  slug: string;
  title: string;
  shortTitle: string;
  weight: string;
  description: string;
  href: string;
};

export const TEACHER_PERFORMANCE_SERVICES: TeacherPerformanceService[] = [
  {
    slug: "job_duties_performance",
    title: "أداء الواجبات الوظيفية",
    shortTitle: "الواجبات",
    weight: "10%",
    description: "خدمة Workflow للمعلم لتوثيق أداء الواجبات الوظيفية ضمن ملف الإنجاز.",
    href: "/dashboard/teacher/job_duties_performance",
  },
  {
    slug: "professional_community_interaction",
    title: "التفاعل مع المجتمع المهني",
    shortTitle: "المجتمع المهني",
    weight: "10%",
    description: "خدمة Workflow للمعلم لتوثيق التفاعل مع المجتمع المهني.",
    href: "/dashboard/teacher/professional_community_interaction",
  },
  {
    slug: "parents_interaction",
    title: "التفاعل مع أولياء الأمور",
    shortTitle: "أولياء الأمور",
    weight: "10%",
    description: "خدمة Workflow للمعلم لتوثيق التفاعل مع أولياء الأمور.",
    href: "/dashboard/teacher/parents_interaction",
  },
  {
    slug: "teaching_strategies_diversity",
    title: "التنويع في استراتيجيات التدريس",
    shortTitle: "الاستراتيجيات",
    weight: "10%",
    description: "خدمة Workflow للمعلم لتوثيق التنويع في استراتيجيات التدريس.",
    href: "/dashboard/teacher/teaching_strategies_diversity",
  },
  {
    slug: "learner_results_improvement",
    title: "تحسين نتائج المتعلمين",
    shortTitle: "تحسين النتائج",
    weight: "10%",
    description: "خدمة Workflow للمعلم لتوثيق تحسين نتائج المتعلمين.",
    href: "/dashboard/teacher/learner_results_improvement",
  },
  {
    slug: "learning_plan_preparation",
    title: "إعداد وتنفيذ خطة التعلم",
    shortTitle: "خطة التعلم",
    weight: "10%",
    description: "خدمة Workflow للمعلم لتوثيق إعداد وتنفيذ خطة التعلم.",
    href: "/dashboard/teacher/learning_plan_preparation",
  },
  {
    slug: "learning_technology_tools",
    title: "توظيف تقنيات ووسائل التعلم المناسبة",
    shortTitle: "التقنيات",
    weight: "10%",
    description: "خدمة Workflow للمعلم لتوثيق توظيف تقنيات ووسائل التعلم المناسبة.",
    href: "/dashboard/teacher/learning_technology_tools",
  },
  {
    slug: "learning_environment",
    title: "تهيئة بيئة تعليمية",
    shortTitle: "البيئة",
    weight: "5%",
    description: "خدمة Workflow للمعلم لتوثيق تهيئة بيئة تعليمية مناسبة.",
    href: "/dashboard/teacher/learning_environment",
  },
  {
    slug: "classroom_management",
    title: "الإدارة الصفية",
    shortTitle: "الإدارة الصفية",
    weight: "5%",
    description: "خدمة Workflow للمعلم لتوثيق الإدارة الصفية.",
    href: "/dashboard/teacher/classroom_management",
  },
  {
    slug: "learner_results_analysis",
    title: "تحليل نتائج المتعلمين وتشخيص مستوياتهم",
    shortTitle: "تحليل النتائج",
    weight: "10%",
    description: "خدمة Workflow للمعلم لتوثيق تحليل نتائج المتعلمين وتشخيص مستوياتهم.",
    href: "/dashboard/teacher/learner_results_analysis",
  },
  {
    slug: "assessment_methods_diversity",
    title: "تنوع أساليب التقويم",
    shortTitle: "التقويم",
    weight: "10%",
    description: "خدمة Workflow للمعلم لتوثيق تنوع أساليب التقويم.",
    href: "/dashboard/teacher/assessment_methods_diversity",
  },
];

export const TEACHER_PERFORMANCE_WORKFLOW_SERVICES = TEACHER_PERFORMANCE_SERVICES.map(
  (service) => ({
    slug: service.slug,
    title: service.title,
    description: service.description,
    href: service.href,
    kind: "workflow" as const,
  }),
);

export function getTeacherPerformanceService(slug: string) {
  return TEACHER_PERFORMANCE_SERVICES.find((service) => service.slug === slug);
}