import { STUDENT_ACTIVITY_COMPETITIONS_SERVICE } from "@/lib/activity-competitions/activity-competitions-service";
import { SCHOOL_ACTIVITY_TEAM_SERVICE } from "@/lib/activity-team/activity-team-config";

export type WorkspaceRole = "COUNSELOR" | "ACTIVITY_LEADER" | "TEACHER";

export type WorkspaceModuleIcon =
  | "workflow"
  | "assignments"
  | "evidence"
  | "surveys"
  | "reports"
  | "students"
  | "assessment"
  | "certificates"
  | "portfolio"
  | "subscription"
  | "account"
  | "schoolSettings"
  | "calendar";

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
  certificates: "/dashboard/certificates",
  teacherReportIssuance: "/dashboard/teacher/report-issuance",
  teacherPerformanceJobDuties: "/dashboard/teacher/job_duties_performance",
  counselorHome: "/dashboard",
  activityLeaderHome: "/dashboard/activity-leader",
  activityLeaderPrograms: "/dashboard/activity-leader/programs",
  activityLeaderCompetitions: STUDENT_ACTIVITY_COMPETITIONS_SERVICE.href,
  teacherHome: "/dashboard/teacher",
  teacherSurveys: "/dashboard/teacher/surveys",
  teacherStudentData: "/dashboard/teacher/student-data",
  teacherAssessmentCenter: "/dashboard/teacher/assessment-center",
} as const;

export const counselorWorkspaceModules: WorkspaceModule[] = [
  {
    title: "تكليفاتي",
    description: "تكليفات إدارة المدرسة واختيار تقرير موجود لإرساله.",
    href: "/dashboard/assignments",
    icon: "assignments",
    status: "available",
  },
  {
    title: "خدمات التوجيه الطلابي",
    description: "خدمات وبرامج التوجيه الطلابي المعتمدة للموجه الطلابي.",
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
    href: OFFICIAL_WORKSPACE_ROUTES.certificates,
    icon: "evidence",
    status: "available",
  },
  {
    title: "ملف الإنجاز",
    description: "وحدة مستقبلية لتجميع أعمال الموجه وإنجازاته.",
    href: "/dashboard/portfolio",
    icon: "portfolio",
    status: "available",
  },
];

export const activityLeaderWorkspaceModules: WorkspaceModule[] = [
  {
    title: "خطة النشاط الطلابي",
    description: "تنظيم برامج النشاط الطلابي ومتابعة تنفيذها أسبوعيًا.",
    href: "/dashboard/activity-leader/activity-plan",
    icon: "calendar",
    status: "available",
  },
  {
    title: SCHOOL_ACTIVITY_TEAM_SERVICE.title,
    description: SCHOOL_ACTIVITY_TEAM_SERVICE.description,
    href: SCHOOL_ACTIVITY_TEAM_SERVICE.href,
    icon: "assignments",
    status: "available",
  },
  {
    title: "تكليفاتي",
    description: "تكليفات إدارة المدرسة واختيار تقرير نشاط موجود لإرساله.",
    href: "/dashboard/activity-leader/assignments",
    icon: "assignments",
    status: "available",
  },
  {
    title: "برامج النشاط",
    description: "اختيار مجال النشاط وتعبئة بطاقة التنفيذ.",
    href: OFFICIAL_WORKSPACE_ROUTES.activityLeaderPrograms,
    icon: "workflow",
    status: "available",
  },
  {
    title: STUDENT_ACTIVITY_COMPETITIONS_SERVICE.title,
    description: STUDENT_ACTIVITY_COMPETITIONS_SERVICE.description,
    href: OFFICIAL_WORKSPACE_ROUTES.activityLeaderCompetitions,
    icon: "workflow",
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
    title: "الشهادات",
    description: "إصدار شهادات وتكريمات للطلاب والمشاركين.",
    href: OFFICIAL_WORKSPACE_ROUTES.certificates,
    icon: "certificates",
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
    status: "available",
  },
];

export const teacherWorkspaceModules: WorkspaceModule[] = [
  {
    title: "الحالات",
    description: "متابعة الحالات المتاحة ضمن نطاق المدرسة والصلاحيات.",
    href: OFFICIAL_WORKSPACE_ROUTES.cases,
    icon: "assignments",
    status: "available",
  },
  {
    title: "إصدار تقرير",
    description: "مساحة Workflow لإصدار تقرير المعلم، وهي قيد التصميم لحين اعتماد المتطلبات.",
    href: OFFICIAL_WORKSPACE_ROUTES.teacherReportIssuance,
    icon: "workflow",
    status: "available",
  },
  {
    title: "التقويم والتنبيهات",
    description: "التقويم والتنبيهات لإدارة المهام والمواعيد اليومية.",
    href: "/dashboard/teacher/calendar",
    icon: "calendar",
    status: "available",
  },
  {
    title: "تكليفاتي",
    description: "متابعة التكليفات المرسلة لك من المدرسة وتنفيذ المطلوب.",
    href: "/dashboard/teacher/assignments",
    icon: "assignments",
    status: "available",
  },
  {
    title: "الاستبيانات",
    description: "إنشاء ومتابعة الاستبيانات من مركز الاستبيانات المشترك.",
    href: OFFICIAL_WORKSPACE_ROUTES.surveys,
    icon: "surveys",
    status: "available",
  },
  {
    title: "التقارير",
    description: "استعراض التقارير من محرك التقارير الرسمي.",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    icon: "reports",
    status: "available",
  },
  {
    title: "رفع الطلاب",
    description: "الوصول إلى مركز رفع بيانات الطلاب المشترك عند توفر الصلاحية.",
    href: OFFICIAL_WORKSPACE_ROUTES.studentImport,
    icon: "students",
    status: "available",
  },
  {
    title: "تحليل نتائج الطلاب",
    description: "إنشاء ومراجعة تحليلات نتائج الطلاب واستخراج التقارير.",
    href: "/dashboard/assessments-center",
    icon: "assessment",
    status: "available",
  },
  {
    title: "الباقات",
    description: "إدارة الاشتراك والباقات المرتبطة بالحساب.",
    href: "/dashboard/subscription",
    icon: "subscription",
    status: "available",
  },
  {
    title: "حسابي",
    description: "إدارة بيانات الحساب والجلسات.",
    href: "/dashboard/account",
    icon: "account",
    status: "available",
  },
  {
    title: "إعدادات المدرسة",
    description: "تحديث بيانات المدرسة والهوية الرسمية.",
    href: "/dashboard/settings/school",
    icon: "schoolSettings",
    status: "available",
  },
  {
    title: "الشهادات",
    description: "إصدار شهادات وتكريمات للطلاب والمشاركين.",
    href: OFFICIAL_WORKSPACE_ROUTES.certificates,
    icon: "certificates",
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

/** Canonical role menu used by workspace surfaces that need to mirror staff availability. */
export function getWorkspaceModulesForRole(role: WorkspaceRole): WorkspaceModule[] {
  if (role === "TEACHER") return teacherWorkspaceModules;
  if (role === "ACTIVITY_LEADER") return activityLeaderWorkspaceModules;
  return counselorWorkspaceModules;
}
