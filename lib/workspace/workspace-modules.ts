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

export const OFFICIAL_WORKSPACE_ROUTES = {
  cases: "/dashboard/cases",
  reports: "/dashboard/report-2",
  surveys: "/dashboard/surveys",
  studentImport: "/dashboard/data-center/student-data-import",
  assessmentCenter: "/dashboard/assessment-center",
  counselorHome: "/dashboard",
  activityLeaderHome: "/dashboard/activity-leader",
  activityLeaderPrograms: "/dashboard/activity-leader/programs",
  teacherHome: "/dashboard/teacher",
} as const;

export const counselorWorkspaceModules: WorkspaceModule[] = [
  {
    title: "الخدمات الإرشادية",
    description: "الخدمات والبرامج الإرشادية المعتمدة للموجه الطلابي.",
    href: "/dashboard/student-guidance-services",
    icon: "workflow",
    status: "available",
  },
  {
    title: "الحالات",
    description: "متابعة الحالات والمسودات والحالات الجاهزة للتقرير.",
    href: OFFICIAL_WORKSPACE_ROUTES.cases,
    icon: "assignments",
    status: "available",
  },
  {
    title: "التقارير",
    description: "إنشاء التقارير الرسمية من المحرك المعتمد.",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    icon: "reports",
    status: "available",
  },
  {
    title: "الاستبيانات",
    description: "إنشاء الاستبيانات ونشرها وتحليل ردود المستفيدين.",
    href: OFFICIAL_WORKSPACE_ROUTES.surveys,
    icon: "surveys",
    status: "available",
  },
  {
    title: "رفع بيانات الطلاب",
    description: "رفع وتنظيم بيانات الطلاب داخل مركز البيانات.",
    href: OFFICIAL_WORKSPACE_ROUTES.studentImport,
    icon: "students",
    status: "available",
  },
  {
    title: "مركز تحليل النتائج",
    description: "تحليل النتائج وبناء التدخلات الذكية.",
    href: OFFICIAL_WORKSPACE_ROUTES.assessmentCenter,
    icon: "assessment",
    status: "available",
  },
  {
    title: "الشهادات",
    description: "إصدار شهادات وتكريمات الطلاب.",
    href: "/dashboard/student-follow-up/appreciation-certificates",
    icon: "evidence",
    status: "available",
  },
  {
    title: "ملف الإنجاز",
    description: "وحدة مستقبلية لتجميع أعمال الموجه وإنجازاته.",
    href: "/dashboard/portfolio",
    icon: "portfolio",
    status: "soon",
  },
];

export const activityLeaderWorkspaceModules: WorkspaceModule[] = [
  {
    title: "برامج النشاط",
    description: "اختيار مجال النشاط وتعبئة بطاقة التنفيذ.",
    href: OFFICIAL_WORKSPACE_ROUTES.activityLeaderPrograms,
    icon: "workflow",
    status: "available",
  },
  {
    title: "الحالات",
    description: "متابعة حالات الأنشطة المعتمدة والشواهد.",
    href: OFFICIAL_WORKSPACE_ROUTES.cases,
    icon: "assignments",
    status: "available",
  },
  {
    title: "تقارير النشاط",
    description: "إصدار التقارير الرسمية من المحرك المعتمد.",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    icon: "reports",
    status: "available",
  },
  {
    title: "الاستبيانات",
    description: "استبيانات النشاط وتحليل الردود.",
    href: "/dashboard/activity-leader/surveys",
    icon: "surveys",
    status: "available",
  },
  {
    title: "رفع بيانات الطلاب",
    description: "رفع وتنظيم بيانات الطلاب داخل مركز البيانات.",
    href: OFFICIAL_WORKSPACE_ROUTES.studentImport,
    icon: "students",
    status: "available",
  },
  {
    title: "مركز تحليل النتائج",
    description: "تحليل المؤشرات والنتائج المرتبطة بالطلاب.",
    href: OFFICIAL_WORKSPACE_ROUTES.assessmentCenter,
    icon: "assessment",
    status: "available",
  },
  {
    title: "الشواهد والمرفقات",
    description: "تنظيم شواهد الأنشطة والمرفقات.",
    href: "/dashboard/activity-leader/evidence",
    icon: "evidence",
    status: "available",
  },
  {
    title: "ملف الإنجاز",
    description: "وحدة مستقبلية لتجميع أعمال رائد النشاط.",
    href: "/dashboard/activity-leader/portfolio",
    icon: "portfolio",
    status: "soon",
  },
];

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
    href: OFFICIAL_WORKSPACE_ROUTES.surveys,
    icon: "surveys",
    status: "available",
  },
  {
    title: "تقاريري",
    description: "استعراض التقارير المرتبطة بالتكليفات والمشاركات.",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    icon: "reports",
    status: "available",
  },
  {
    title: "بيانات الطلاب",
    description: "الوصول إلى بيانات الطلاب حسب الصلاحيات المتاحة.",
    href: OFFICIAL_WORKSPACE_ROUTES.studentImport,
    icon: "students",
    status: "available",
  },
  {
    title: "مركز تحليل النتائج",
    description: "الاطلاع على التحليلات والمؤشرات المرتبطة بالطلاب.",
    href: OFFICIAL_WORKSPACE_ROUTES.assessmentCenter,
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