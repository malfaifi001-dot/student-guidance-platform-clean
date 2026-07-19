import { OFFICIAL_WORKSPACE_ROUTES } from "@/lib/workspace/workspace-modules";
import {
  ACTIVITY_PROGRAM_PARENT_SERVICE,
  ACTIVITY_PROGRAM_WORKFLOW_SERVICES,
} from "@/lib/activity-programs/activity-program-catalog";
import { TEACHER_PERFORMANCE_WORKFLOW_SERVICES } from "@/lib/teacher-performance/teacher-performance-services";

export type AppService = {
  slug: string;
  title: string;
  description: string;
  href: string;
  kind: "workflow" | "standalone" | "admin";
};

export const workflowServices: AppService[] = [
  ...ACTIVITY_PROGRAM_WORKFLOW_SERVICES,
  ...TEACHER_PERFORMANCE_WORKFLOW_SERVICES,
  {
    slug: "teacher-report-issuance",
    title: "إصدار تقرير",
    description: "خدمة للمعلم لإصدار تقرير عبر نموذج Workflow منشور من الأدمن.",
    href: "/dashboard/teacher/report-issuance",
    kind: "workflow",
  },
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
    slug: "guardian-summons",
    title: "استدعاء ولي أمر",
    description:
      "إنشاء وتوثيق استدعاءات أولياء الأمور وربطها بالطلاب والحالات والتقارير الرسمية.",
    href: "/dashboard/guardian-summons",
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

export const smartInterventionWorkflowServices: AppService[] = [
  {
    slug: "smart-student-support",
    title: "تدخل فردي ذكي",
    description: "Workflow مستقل للتدخلات الفردية الناتجة من مركز التحليل.",
    href: "/dashboard/smart-student-support",
    kind: "workflow",
  },
  {
    slug: "smart-student-excellence",
    title: "تعزيز وتميز ذكي",
    description: "Workflow مستقل لرعاية الطلاب المتميزين وتعزيزهم.",
    href: "/dashboard/smart-student-excellence",
    kind: "workflow",
  },
  {
    slug: "smart-student-group-custom",
    title: "خطة جماعية مخصصة",
    description: "Workflow مستقل لخطة جماعية يحدد المستخدم طلابها يدويًا.",
    href: "/dashboard/smart-student-group-custom",
    kind: "workflow",
  },
  {
    slug: "smart-student-group-subject",
    title: "خطة جماعية حسب مادة",
    description: "Workflow مستقل لمجموعة طلاب لديهم ضعف مشترك في مادة.",
    href: "/dashboard/smart-student-group-subject",
    kind: "workflow",
  },
  {
    slug: "smart-classroom-support",
    title: "خطة فصل ذكية",
    description: "Workflow مستقل للتدخلات الصفية على مستوى الفصل.",
    href: "/dashboard/smart-classroom-support",
    kind: "workflow",
  },
  {
    slug: "smart-grade-support",
    title: "خطة صف دراسي ذكية",
    description: "Workflow مستقل للتدخلات على مستوى الصف الدراسي.",
    href: "/dashboard/smart-grade-support",
    kind: "workflow",
  },
  {
    slug: "smart-subject-support",
    title: "تدخل علاجي لمادة",
    description: "Workflow مستقل للتدخلات العلاجية على مستوى المادة.",
    href: "/dashboard/smart-subject-support",
    kind: "workflow",
  },
];

export const SMART_INTERVENTION_SERVICE_SLUGS = smartInterventionWorkflowServices.map(
  (service) => service.slug,
);

export const SMART_INTERVENTION_TARGET_SERVICE_SLUG_BY_TYPE: Record<string, string> = {
  STUDENT_SUPPORT: "smart-student-support",
  STUDENT_EXCELLENCE: "smart-student-excellence",
  STUDENT_GROUP_CUSTOM: "smart-student-group-custom",
  STUDENT_GROUP_SUBJECT: "smart-student-group-subject",
  CLASSROOM_SUPPORT: "smart-classroom-support",
  GRADE_SUPPORT: "smart-grade-support",
  SUBJECT_SUPPORT: "smart-subject-support",
};

export const workflowUploadServices: AppService[] = [
  ...workflowServices,
  ...smartInterventionWorkflowServices,
];

export const standaloneServices: AppService[] = [
  {
    slug: "counselor-reference-library",
    title: "المرجع الشامل للموجه الطلابي",
    description:
      "مكتبة الحقائب والأدلة والملفات المهنية الخاصة بالموجه الطلابي.",
    href: "/dashboard/counselor-reference-library",
    kind: "standalone",
  },
  ACTIVITY_PROGRAM_PARENT_SERVICE,
  {
    slug: "comprehensive-reference",
    title: "المرجع الشامل للموجه الطلابي",
    description: "مرجع شامل للموجه الطلابي لمتابعة بيانات الطلاب وسجلاتهم.",
    href: "/dashboard/comprehensive-reference",
    kind: "standalone",
  },
  {
    slug: "surveys",
    title: "الاستبيانات",
    description: "إنشاء الاستبيانات ونشرها وتحليل ردود المستفيدين.",
    href: OFFICIAL_WORKSPACE_ROUTES.surveys,
    kind: "standalone",
  },
  {
    slug: "results-analysis",
    title: "تحليل النتائج",
    description: "رفع وتحليل نتائج الطلاب.",
    href: OFFICIAL_WORKSPACE_ROUTES.assessmentCenter,
    kind: "standalone",
  },
  {
    slug: "assessment-center",
    title: "مركز التحليل والاختبارات",
    description: "تحليل نتائج الطلاب والاختبارات، وربطها بالتدخلات والخطط الذكية.",
    href: OFFICIAL_WORKSPACE_ROUTES.assessmentCenter,
    kind: "standalone",
  },
  {
    slug: "reports",
    title: "التقارير",
    description: "إنشاء ومعاينة واعتماد التقارير.",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    kind: "standalone",
  },
  {
    slug: "custom-report",
    title: "التقرير المخصص",
    description: "إنشاء تقارير مخصصة ومرنة حسب احتياج المدرسة.",
    href: "/dashboard/custom-report",
    kind: "standalone",
  },
];

export const dashboardServices = [
  ...workflowServices,
  ...standaloneServices,
];
