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
    description: "متابعة الطلاب والحالات الطلابية.",
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
    description: "توثيق التواصل بين الأسرة والمدرسة.",
    href: "/dashboard/family-school-communication",
    kind: "workflow",
  },
  {
    slug: "student-guidance-services",
    title: "الخدمات الإرشادية المقدمة للطلاب",
    description: "إدارة الخدمات الإرشادية المقدمة للطلاب.",
    href: "/dashboard/student-guidance-services",
    kind: "workflow",
  },
];

export const standaloneServices: AppService[] = [
  {
    slug: "comprehensive-reference",
    title: "المرجع الشامل للموجه الطلابي",
    description: "مرجع شامل للموجه الطلابي لمتابعة بيانات الطلاب وسجلاتهم.",
    href: "/dashboard/comprehensive-reference",
    kind: "standalone",
  },
  {
    slug: "results-analysis",
    title: "تحليل النتائج",
    description: "رفع وتحليل نتائج الطلاب.",
    href: "/dashboard/results-analysis",
    kind: "standalone",
  },
  {
    slug: "reports",
    title: "التقارير",
    description: "إنشاء ومعاينة واعتماد التقارير.",
    href: "/dashboard/reports",
    kind: "standalone",
  },
];

export const dashboardServices = [
  ...workflowServices,
  ...standaloneServices,
];
