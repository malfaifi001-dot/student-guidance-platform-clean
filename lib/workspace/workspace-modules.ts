export type WorkspaceRole = "COUNSELOR" | "ACTIVITY_LEADER" | "TEACHER";

export type WorkspaceModuleIcon =
  | "workflow"
  | "assignments"
  | "evidence"
  | "surveys"
  | "reports"
  | "students"
  | "assessment"
  | "portfolio";

export type WorkspaceModule = {
  title: string;
  description: string;
  href: string;
  icon: WorkspaceModuleIcon;
  status?: "available" | "soon";
};

export const teacherWorkspaceModules: WorkspaceModule[] = [
  {
    title: "الأسرة والمجتمع",
    description: "خدمة Workflow تجريبية للمعلم، ويمكن لاحقًا ربطها بنموذج ديناميكي.",
    href: "/dashboard/teacher/family-community",
    icon: "workflow",
    status: "soon",
  },
  {
    title: "تكليفاتي",
    description: "متابعة التكليفات المرسلة لك من المدرسة وتنفيذ المطلوب.",
    href: "/dashboard/teacher/assignments",
    icon: "assignments",
    status: "soon",
  },
  {
    title: "شواهدي",
    description: "رفع وتنظيم الشواهد والمرفقات المرتبطة بمشاركاتك.",
    href: "/dashboard/teacher/evidence",
    icon: "evidence",
    status: "soon",
  },
  {
    title: "استبياناتي",
    description: "الوصول إلى الاستبيانات المطلوبة منك أو التي شاركت بها.",
    href: "/dashboard/surveys",
    icon: "surveys",
    status: "available",
  },
  {
    title: "تقاريري",
    description: "استعراض التقارير المرتبطة بالتكليفات والمشاركات.",
    href: "/dashboard/report-2",
    icon: "reports",
    status: "available",
  },
  {
    title: "بيانات الطلاب",
    description: "الوصول إلى بيانات الطلاب حسب الصلاحيات المتاحة.",
    href: "/dashboard/data-center/student-data-import",
    icon: "students",
    status: "available",
  },
  {
    title: "مركز تحليل النتائج",
    description: "الاطلاع على التحليلات والمؤشرات المرتبطة بالطلاب.",
    href: "/dashboard/assessment-center",
    icon: "assessment",
    status: "available",
  },
  {
    title: "ملف إنجازي",
    description: "ملف موحد يجمع مشاركاتك وشواهدك وتكليفاتك.",
    href: "/dashboard/teacher/portfolio",
    icon: "portfolio",
    status: "soon",
  },
];