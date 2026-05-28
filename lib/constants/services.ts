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
    title: "البرامج التوجيهية",
    description: "إدارة البرامج وخطط التنفيذ والشواهد.",
    href: "/dashboard/guidance-programs",
    kind: "workflow",
  },
  {
    slug: "student-follow-up",
    title: "متابعة الطلاب",
    description: "متابعة الحالات وربطها ببيانات نور.",
    href: "/dashboard/student-follow-up",
    kind: "workflow",
  },
  {
    slug: "committees-meetings",
    title: "اللجان والاجتماعات",
    description: "محاضر وتوصيات وأعضاء اللجان.",
    href: "/dashboard/committees-meetings",
    kind: "workflow",
  },
  {
    slug: "family-school-communication",
    title: "التواصل بين الأسرة والمدرسة",
    description: "توثيق التواصل ونتائجه بطريقة مترابطة.",
    href: "/dashboard/family-school-communication",
    kind: "workflow",
  },
  {
    slug: "student-guidance-services",
    title: "الخدمات التوجيهية المقدمة للطلاب",
    description: "إرشاد فردي وجمعي ودراسة حالة وتوجيه جمعي.",
    href: "/dashboard/student-guidance-services",
    kind: "workflow",
  },
];

export const standaloneServices: AppService[] = [
  {
    slug: "comprehensive-reference",
    title: "المرجع الشامل للموجه الطلابي",
    description: "مكتبة ملفات ونماذج وحقائب تدريبية.",
    href: "/dashboard/comprehensive-reference",
    kind: "standalone",
  },
  {
    slug: "results-analysis",
    title: "تحليل النتائج",
    description: "تحليل ملفات Excel والرسوم البيانية.",
    href: "/dashboard/results-analysis",
    kind: "standalone",
  },
  {
    slug: "reports",
    title: "التقارير",
    description: "تقارير رسمية قابلة للتصدير لاحقًا.",
    href: "/dashboard/reports",
    kind: "standalone",
  },
];

export const dashboardServices = [...workflowServices, ...standaloneServices];