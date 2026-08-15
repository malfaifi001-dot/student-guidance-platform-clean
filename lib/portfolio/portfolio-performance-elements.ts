import { ACTIVITY_PROGRAM_DOMAINS } from "@/lib/activity-programs/activity-program-catalog";
import { COUNSELOR_GUIDANCE_WORKFLOW_SERVICES } from "@/lib/constants/services";
import { PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES } from "@/lib/principal/evaluation-accreditation-services";
import { PRINCIPAL_PERFORMANCE_ITEMS } from "@/lib/principal/performance-items";

export type PortfolioServiceGroup = {
  key: string;
  title: string;
  order: number;
};

export type PortfolioPerformanceElement = {
  key: string;
  title: string;
  weight: number;
  serviceSlug: string;
  intro: string;
  group?: PortfolioServiceGroup;
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

const COUNSELOR_PORTFOLIO_SERVICE_SLUGS = [
  "guidance-programs",
  "committees-meetings",
  "student-follow-up",
  "student-guidance-services",
  "family-school-communication",
  "student-guidance-evaluation-indicators",
] as const;

const COUNSELOR_PORTFOLIO_ELEMENTS: PortfolioPerformanceElement[] = COUNSELOR_PORTFOLIO_SERVICE_SLUGS
  .map((slug) => COUNSELOR_GUIDANCE_WORKFLOW_SERVICES.find((service) => service.slug === slug))
  .filter((service): service is NonNullable<typeof service> => Boolean(service)).map((service) => ({
  key: service.slug,
  title: service.title,
  weight: 0,
  serviceSlug: service.slug,
  intro: service.description,
}));

const ACTIVITY_LEADER_PORTFOLIO_ELEMENTS: PortfolioPerformanceElement[] = ACTIVITY_PROGRAM_DOMAINS.map((domain) => ({
  key: domain.serviceSlug,
  title: domain.title,
  weight: 0,
  serviceSlug: domain.serviceSlug,
  intro: domain.description,
}));

const PRINCIPAL_PERFORMANCE_GROUP: PortfolioServiceGroup = {
  key: "principal-performance-evaluation",
  title: "عناصر تقييم الأداء",
  order: 1,
};

const PRINCIPAL_EVALUATION_ACCREDITATION_GROUP: PortfolioServiceGroup = {
  key: "principal-evaluation-accreditation",
  title: "التقويم والاعتماد",
  order: 2,
};

const PRINCIPAL_PORTFOLIO_ELEMENTS: PortfolioPerformanceElement[] = [
  ...PRINCIPAL_PERFORMANCE_ITEMS.map((item) => ({
    key: item.serviceSlug,
    title: item.title,
    weight: 0,
    serviceSlug: item.serviceSlug,
    intro: item.description,
    group: PRINCIPAL_PERFORMANCE_GROUP,
  })),
  ...PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES.map((service) => ({
    key: service.serviceSlug,
    title: service.title,
    weight: 0,
    serviceSlug: service.serviceSlug,
    intro: service.description,
    group: PRINCIPAL_EVALUATION_ACCREDITATION_GROUP,
  })),
];

export function getPortfolioPerformanceElements(role?: string | null): PortfolioPerformanceElement[] {
  if (role === "TEACHER") return TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS;
  if (role === "COUNSELOR") return COUNSELOR_PORTFOLIO_ELEMENTS;
  if (role === "ACTIVITY_LEADER") return ACTIVITY_LEADER_PORTFOLIO_ELEMENTS;
  if (role === "PRINCIPAL") return PRINCIPAL_PORTFOLIO_ELEMENTS;
  return [];
}

export type PortfolioSectionDefinition = {
  key: string;
  kind: "STATIC" | "PERFORMANCE_ELEMENT";
  title: string;
  intro: string;
  defaultSortOrder: number;
  service?: PortfolioPerformanceElement;
};

export function getPortfolioDefaultSectionOrderForRole(role?: string | null): PortfolioSectionDefinition[] {
  const profileIntro = role === "TEACHER" ? "نبذة مختصرة عن المعلم وخبراته." : "نبذة مختصرة عن صاحب الملف وخبراته المهنية.";
  const services = getPortfolioPerformanceElements(role);
  return [
    { key: "introduction", kind: "STATIC", title: "المقدمة", intro: "مدخل موجز لملف الإنجاز.", defaultSortOrder: 10 },
    { key: "profile", kind: "STATIC", title: "السيرة المهنية", intro: profileIntro, defaultSortOrder: 20 },
    { key: "qualifications", kind: "STATIC", title: "المؤهلات والدورات", intro: "المؤهلات العلمية والدورات والشهادات.", defaultSortOrder: 30 },
    ...services.map((service, index) => ({
      key: service.key,
      kind: "PERFORMANCE_ELEMENT" as const,
      title: service.title,
      intro: service.intro,
      defaultSortOrder: 100 + index * 10,
      service,
    })),
    { key: "reports-evidence", kind: "STATIC", title: "التقارير والشواهد", intro: "التقارير والشواهد المهنية المرتبطة بالملف.", defaultSortOrder: 900 },
    { key: "closing", kind: "STATIC", title: "الخاتمة", intro: "خاتمة مختصرة لملف الإنجاز.", defaultSortOrder: 1000 },
  ];
}

export function shouldShowPortfolioWeights(role?: string | null) {
  return role === "TEACHER";
}

export function getTeacherPortfolioElementByServiceSlug(serviceSlug: string) {
  return TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS.find(
    (item) => item.serviceSlug === serviceSlug,
  );
}
