export type AppService = {
  slug: string;
  title: string;
  description: string;
  href: string;
  kind: "workflow" | "standalone" | "admin";
};

export const workflowServices: AppService[] = [
  {
    slug: "guidance-programs",
    title: "البرامج الإرشادية",
    description: "إدارة البرامج الإرشادية وخطط التنفيذ.",
    href: "/dashboard/guidance-programs",
    kind: "workflow",
  },
  {
    slug: "student-follow-up",
    title: "متابعة الطلاب",
    description: "متابعة الحالات الطلابية عبر Workflow ديناميكي.",
    href: "/dashboard/student-follow-up",
    kind: "workflow",
  },
  {
    slug: "committees-meetings",
    title: "اللجان والاجتماعات",
    description: "إدارة محاضر اللجان والاجتماعات والتوصيات.",
    href: "/dashboard/committees-meetings",
    kind: "workflow",
  },
  {
    slug: "family-school-communication",
    title: "التواصل بين الأسرة والمدرسة",
    description: "توثيق التواصل مع ولي الأمر ونتائج التواصل.",
    href: "/dashboard/family-school-communication",
    kind: "workflow",
  },
  {
    slug: "student-guidance-services",
    title: "الخدمات التوجيهية المقدمة للطلاب",
    description: "إدارة الخدمات التوجيهية عبر Workflow ديناميكي.",
    href: "/dashboard/student-guidance-services",
    kind: "workflow",
  },
];

export const standaloneServices: AppService[] = [
  {
    slug: "comprehensive-reference",
    title: "السجل الشامل للطالب",
    description: "عرض بيانات الطالب وسجلاته التربوية.",
    href: "/dashboard/comprehensive-reference",
    kind: "standalone",
  },
  {
    slug: "results-analysis",
    title: "تحليل النتائج",
    description: "رفع وتحليل نتائج الطلاب من ملفات Excel.",
    href: "/dashboard/results-analysis",
    kind: "standalone",
  },
  {
    slug: "reports",
    title: "التقارير",
    description: "إنشاء ومعاينة واعتماد التقارير الإرشادية.",
    href: "/dashboard/reports",
    kind: "standalone",
  },
];

export const dashboardServices = [
  ...workflowServices,
  ...standaloneServices,
];