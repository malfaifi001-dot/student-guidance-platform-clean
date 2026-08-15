import type { AppService, WorkflowServiceOwnerRole } from "@/lib/constants/services";
import { workflowServicesByRole } from "@/lib/constants/services";
import type { GuidanceGender } from "@/lib/guidance/arabic-gender-copy";

export type GuidedWorkspaceRole = "COUNSELOR" | "ACTIVITY_LEADER";
export type RoleOnboardingPhase = "WELCOME" | "SELECT_SERVICE" | "CREATE_WORK" | "WORKFLOW_FORM" | "EVIDENCE" | "WORKING" | "PREPARE" | "DESCRIPTION" | "PREPARE_WAIT" | "STUDIO" | "SCHOOL_IDENTITY" | "SCHOOL_WAIT" | "RETURN_STUDIO" | "SAVE_REPORT" | "SAVE_REPORT_WAIT" | "PORTFOLIO" | "COMPLETED";
export type RoleOnboardingState = {
  version: 1;
  role: GuidedWorkspaceRole;
  status: "unseen" | "in_progress" | "paused" | "completed";
  phase: RoleOnboardingPhase;
  servicePath: string | null;
  caseId: string | null;
  returnUrl: string | null;
  updatedAt: string;
};

export const ROLE_ONBOARDING_INITIAL_STATE = (role: GuidedWorkspaceRole): RoleOnboardingState => ({
  version: 1, role, status: "unseen", phase: "WELCOME", servicePath: null, caseId: null, returnUrl: null, updatedAt: "",
});

export function getRoleOnboardingServices(role: GuidedWorkspaceRole): AppService[] {
  return workflowServicesByRole[role].filter((service) => service.kind === "workflow" && (role !== "COUNSELOR" || !service.slug.startsWith("smart-")));
}

export function getRoleOnboardingStartPath(role: GuidedWorkspaceRole) {
  return role === "COUNSELOR" ? "/dashboard" : "/dashboard/activity-leader";
}

export function getRolePortfolioPath(role: GuidedWorkspaceRole) {
  return role === "COUNSELOR" ? "/dashboard/portfolio" : "/dashboard/activity-leader/portfolio";
}

export function getRoleGreeting(role: GuidedWorkspaceRole, gender: GuidanceGender, displayName?: string | null) {
  const name = String(displayName || "").trim();
  const title = role === "COUNSELOR"
    ? (gender === "FEMALE" ? "موجهة" : "موجه")
    : (gender === "FEMALE" ? "رائدة النشاط" : "رائد النشاط");
  return `مرحبًا يا ${title}${name ? ` ${name}` : ""}`;
}

export function getRoleOnboardingCard(phase: RoleOnboardingPhase, role: GuidedWorkspaceRole, gender: GuidanceGender, displayName?: string | null) {
  const activity = role === "ACTIVITY_LEADER";
  const cards = {
    WELCOME: { title: getRoleGreeting(role, gender, displayName), description: activity ? "بنمشي معك خطوة بخطوة لتوثيق نشاطك وتحويله إلى تقرير." : "بنمشي معك خطوة بخطوة لتوثيق عملك وتحويله إلى تقرير.", primaryLabel: "ابدأ الرحلة" },
    SELECT_SERVICE: { title: activity ? "اختر مجال النشاط" : "اختر خدمتك", description: activity ? "ابدأ من برنامج نشاط حقيقي." : "ابدأ من خدمة تعمل عليها فعلًا.", primaryLabel: "فتح الخدمة", kind: "performance-select" as const },
    CREATE_WORK: { target: "service-create", title: "ابدأ التوثيق", description: "أنشئ سجلًا حقيقيًا من عملك.", primaryLabel: "إنشاء" },
    WORKFLOW_FORM: { target: "workflow-main-fields", title: "خذ راحتك", description: "اختر الحقول التي تناسب عملك، ثم أكمل النموذج براحتك.", primaryLabel: "فهمت" },
    EVIDENCE: { target: "workflow-evidence", title: "عزّز عملك", description: "أضف الشواهد التي تدعم ما أنجزته.", primaryLabel: "التالي" },
    PREPARE: { target: "report-prepare-fields", title: "جهّز تقريرك", description: "عدّل العناوين والمحتوى، وحدد ما يظهر في التقرير.", primaryLabel: "التالي" },
    DESCRIPTION: { target: "report-prepare-description", title: "الوصف التنفيذي", description: "يُجهزه Teachix من بياناتك، ويمكنك تعديله قبل المعاينة.", primaryLabel: "معاينة التقرير" },
    STUDIO: { target: "studio-report-canvas", title: "باقي اللمسات", description: "أكمل بيانات الهوية مرة واحدة لتظهر في تقاريرك القادمة.", primaryLabel: "إكمال الهوية" },
    SCHOOL_IDENTITY: { target: "teacher-school-identity", title: "هوية التقرير", description: "أكمل البيانات الأساسية والتوقيع المطلوب للتقرير.", primaryLabel: "فهمت" },
    RETURN_STUDIO: { title: "تقريرك جاهز", description: "يمكنك الآن حفظ التقرير أو تحميله، وإرساله للتوقيع عند الحاجة.", primaryLabel: "العودة للتقرير" },
    SAVE_REPORT: { target: "teacher-report-finalize", title: "اعتمد التقرير", description: "استخدم إجراءات التقرير الحالية للحفظ والتنزيل.", primaryLabel: "فهمت" },
    PORTFOLIO: { target: "teacher-portfolio-reports", title: "ملف إنجازك", description: "هنا تجمع تقاريرك وأعمالك.", primaryLabel: "إنهاء الجولة" },
  } as const;
  return cards[phase as keyof typeof cards] || null;
}
