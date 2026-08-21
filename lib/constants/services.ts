import { OFFICIAL_WORKSPACE_ROUTES } from "@/lib/workspace/workspace-modules";
import {
  ACTIVITY_PROGRAM_PARENT_SERVICE,
  ACTIVITY_PROGRAM_WORKFLOW_SERVICES,
} from "@/lib/activity-programs/activity-program-catalog";
import { TEACHER_PERFORMANCE_WORKFLOW_SERVICES } from "@/lib/teacher-performance/teacher-performance-services";
import { STUDENT_ACTIVITY_COMPETITIONS_SERVICE } from "@/lib/activity-competitions/activity-competitions-service";
import { PRINCIPAL_PERFORMANCE_WORKFLOW_SERVICES } from "@/lib/principal/performance-items";
import { PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES } from "@/lib/principal/evaluation-accreditation-services";
import { STUDENT_ACTIVITY_PLAN_SERVICE } from "@/lib/activity-plan/activity-plan-service";

export type AppService = {
  slug: string;
  title: string;
  description: string;
  href: string;
  kind: "workflow" | "standalone" | "admin";
};

export const WORKFLOW_SERVICE_OWNER_ROLES = [
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "TEACHER",
  "PRINCIPAL",
] as const;

export type WorkflowServiceOwnerRole =
  (typeof WORKFLOW_SERVICE_OWNER_ROLES)[number];

export const WORKFLOW_SERVICE_OWNER_LABELS: Record<
  WorkflowServiceOwnerRole,
  string
> = {
  COUNSELOR: "الموجه الطلابي",
  ACTIVITY_LEADER: "رائد النشاط",
  TEACHER: "المعلم",
  PRINCIPAL: "مدير المدرسة",
};

export const COUNSELOR_GUIDANCE_WORKFLOW_SERVICES: AppService[] = [
  {
    slug: "guidance-programs",
    title: "برامج التوجيه الطلابي",
    description: "إدارة برامج التوجيه الطلابي وخطط التنفيذ.",
    href: "/dashboard/guidance-programs",
    kind: "workflow",
  },
  {
    slug: "student-follow-up",
    title: "متابعة الطلبة والمواقف اليومية الطارئة",
    description: "متابعة الطلبة والمواقف اليومية الطارئة والحالات الطلابية.",
    href: "/dashboard/student-follow-up",
    kind: "workflow",
  },
  {
    slug: "guardian-summons",
    title: "إشعار ولي الأمر",
    description:
      "إنشاء وتوثيق إشعارات أولياء الأمور وربطها بالطلاب والحالات والتقارير الرسمية.",
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
    title: "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
    description: "توثيق التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور.",
    href: "/dashboard/family-school-communication",
    kind: "workflow",
  },
  {
    slug: "student-guidance-services",
    title: "خدمات التوجيه الطلابي",
    description: "إدارة خدمات التوجيه الطلابي.",
    href: "/dashboard/student-guidance-services",
    kind: "workflow",
  },
  {
    slug: "student-guidance-evaluation-indicators",
    title: "مؤشرات التوجيه الطلابي للتقويم المدرسي والتقويم الخارجي",
    description:
      "إدارة مؤشرات التوجيه الطلابي المرتبطة بالتقويم المدرسي والتقويم الخارجي وتوثيقها عبر نماذج Workflow.",
    href: "/dashboard/student-guidance-evaluation-indicators",
    kind: "workflow",
  },
];

const principalEvaluationAccreditationWorkflowServices: AppService[] =
  PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES.map((service) => ({
    slug: service.serviceSlug,
    title: service.title,
    description: service.description,
    href: service.href,
    kind: "workflow" as const,
  }));

const teacherReportIssuanceWorkflowService: AppService = {
  slug: "teacher-report-issuance",
  title: "إصدار تقرير",
  description: "خدمة للمعلم لإصدار تقرير عبر نموذج Workflow منشور من الأدمن.",
  href: "/dashboard/teacher/report-issuance",
  kind: "workflow",
};

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

/**
 * المصدر المركزي لملكية خدمات Workflow حسب مساحة العمل.
 * تعتمد عليه واجهة ADMIN وقائمة خدمات الرفع بدل استنتاج الدور من slug الخدمة.
 */
export const workflowServicesByRole: Record<
  WorkflowServiceOwnerRole,
  AppService[]
> = {
  COUNSELOR: [
    ...COUNSELOR_GUIDANCE_WORKFLOW_SERVICES,
    ...smartInterventionWorkflowServices,
  ],
  ACTIVITY_LEADER: [
    ...ACTIVITY_PROGRAM_WORKFLOW_SERVICES,
    STUDENT_ACTIVITY_COMPETITIONS_SERVICE,
  ],
  TEACHER: [
    ...TEACHER_PERFORMANCE_WORKFLOW_SERVICES,
    teacherReportIssuanceWorkflowService,
  ],
  PRINCIPAL: [
    ...PRINCIPAL_PERFORMANCE_WORKFLOW_SERVICES,
    ...principalEvaluationAccreditationWorkflowServices,
  ],
};

const workflowServiceOwnerRoleBySlug = new Map<
  string,
  WorkflowServiceOwnerRole
>(
  WORKFLOW_SERVICE_OWNER_ROLES.flatMap((role) =>
    workflowServicesByRole[role].map(
      (service) => [service.slug, role] as const,
    ),
  ),
);

export function getWorkflowServiceOwnerRole(serviceSlug: string) {
  return workflowServiceOwnerRoleBySlug.get(serviceSlug) ?? null;
}

/**
 * خدمات التشغيل المعتادة. التدخلات الذكية تبقى خارج dashboardServices كما كانت.
 */
export const workflowServices: AppService[] = [
  ...workflowServicesByRole.ACTIVITY_LEADER,
  ...workflowServicesByRole.TEACHER,
  ...workflowServicesByRole.PRINCIPAL,
  ...COUNSELOR_GUIDANCE_WORKFLOW_SERVICES,
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

export const workflowUploadServices: AppService[] =
  WORKFLOW_SERVICE_OWNER_ROLES.flatMap(
    (role) => workflowServicesByRole[role],
  );

export const standaloneServices: AppService[] = [
  STUDENT_ACTIVITY_PLAN_SERVICE,
  {
    slug: "curriculum-distribution",
    title: "توزيع المنهج",
    description: "استعراض توزيع الوحدات والدروس للمعلمين.",
    href: "/dashboard/teacher/curriculum-distribution",
    kind: "standalone",
  },
  {
    slug: "counselor-reference-library",
    title: "مكتبة الموجه الطلابي",
    description:
      "مكتبة الحقائب والأدلة والملفات المهنية الخاصة بالموجه الطلابي.",
    href: "/dashboard/counselor-reference-library",
    kind: "standalone",
  },
  ACTIVITY_PROGRAM_PARENT_SERVICE,
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
