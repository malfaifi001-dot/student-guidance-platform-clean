import type { GuidanceGender } from "@/lib/guidance/arabic-gender-copy";
import { teacherGenderCopy } from "@/lib/guidance/arabic-gender-copy";
import { TEACHER_PERFORMANCE_SERVICES } from "@/lib/teacher-performance/teacher-performance-services";

export const TEACHER_ONBOARDING_PHASES = [
  "WELCOME",
  "INTRO",
  "SELECT_PERFORMANCE",
  "CREATE_WORK",
  "WORKFLOW_FORM",
  "EVIDENCE",
  "WORKING",
  "SUBMIT_WORK",
  "CASE_EDIT",
  "CASE_REPORT",
  "REPORT_FIELDS",
  "LUCKY20",
  "REPORT_DESCRIPTION",
  "REPORT_PREVIEW",
  "SCHOOL_IDENTITY",
  "SCHOOL_WAIT",
  "PRINCIPAL_NAME",
  "SIGNATURE",
  "RETURN_REPORT",
  "REFLECTED_IDENTITY",
  "STUDIO_WAIT",
  "SAVE_REPORT",
  "SAVED_REPORT",
  "PORTFOLIO",
  "COMPLETED",
] as const;

export type TeacherOnboardingPhase = (typeof TEACHER_ONBOARDING_PHASES)[number];
export type TeacherOnboardingStatus = "unseen" | "in_progress" | "paused" | "completed";

export type TeacherOnboardingState = {
  version: 1;
  status: TeacherOnboardingStatus;
  phase: TeacherOnboardingPhase;
  caseId: string | null;
  reportId: string | null;
  returnUrl: string | null;
  selectedPerformancePath: string | null;
  lucky20Attempts: number;
  lucky20Earned: boolean;
  lucky20Reward: boolean;
  updatedAt: string;
};

export type TeacherJourneyCard = {
  target?: string;
  title: string;
  description?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  kind?: "standard" | "lucky20" | "performance-select" | "waiting";
  lucky20Reward?: boolean;
};

export const INITIAL_TEACHER_ONBOARDING_STATE: TeacherOnboardingState = {
  version: 1,
  status: "unseen",
  phase: "WELCOME",
  caseId: null,
  reportId: null,
  returnUrl: null,
  selectedPerformancePath: null,
  lucky20Attempts: 0,
  lucky20Earned: false,
  lucky20Reward: false,
  updatedAt: "",
};

export const TEACHER_ONBOARDING_VISIBLE_PHASES = TEACHER_ONBOARDING_PHASES.filter(
  (phase) => phase !== "COMPLETED",
);

export function teacherJourneyProgress(phase: TeacherOnboardingPhase) {
  const visiblePhases: readonly TeacherOnboardingPhase[] = TEACHER_ONBOARDING_VISIBLE_PHASES;
  const index = Math.max(0, visiblePhases.indexOf(phase));
  return { current: index + 1, total: TEACHER_ONBOARDING_VISIBLE_PHASES.length };
}

export function getTeacherJourneyCard(
  phase: TeacherOnboardingPhase,
  gender: GuidanceGender,
  lucky20Reward = false,
): TeacherJourneyCard | null {
  const copy = teacherGenderCopy(gender);
  const cards: Partial<Record<TeacherOnboardingPhase, TeacherJourneyCard>> = {
    WELCOME: {
      title: copy.welcome,
      description: `سنرافقك ${copy.teacher === "معلمة" ? "لإنشاء" : "لإنشاء"} أول تقرير حقيقي بخطوات قصيرة.`,
      primaryLabel: copy.start,
      secondaryLabel: "لاحقًا",
    },
    INTRO: {
      title: "من العمل إلى الإنجاز",
      description: "يحوّل Teachix عملك إلى تقارير منظمة ويربطها بملف الإنجاز.",
      primaryLabel: "خلّنا ننشئ أول تقرير",
    },
    SELECT_PERFORMANCE: {
      title: "ابدأ من عنصر أداء",
      description: "اختر العنصر الذي ستوثّق عملك من خلاله.",
      primaryLabel: "فتح العنصر",
      kind: "performance-select",
    },
    CREATE_WORK: {
      target: "service-create",
      title: "ابدأ التوثيق",
      description: "هذا ينشئ عملًا موثقًا يمكن تحويله لاحقًا إلى تقرير.",
      primaryLabel: "إنشاء تقرير جديد",
    },
    WORKFLOW_FORM: {
      target: "workflow-main-fields",
      title: "خذ راحتك",
      description: "اختَر الحقول اللي تناسب تقريرك، وممكن تبدأ بتقرير بسيط فقط لتتعرف على Teachix.\nتذكّر: فقط الحقول اللي تختارها راح تظهر في التقرير.",
      primaryLabel: "فهمت",
    },
    EVIDENCE: {
      target: "workflow-evidence",
      title: "عزّز تقريرك",
      description: "عزّز تقريرك بالشواهد.",
      primaryLabel: "التالي",
    },
    WORKING: {
      title: "خذ وقتك",
      description: "بعد ما تخلص، Teachix ينتظرك في الخطوة القادمة.",
      primaryLabel: "",
      kind: "waiting",
    },
    SUBMIT_WORK: {
      target: "workflow-submit",
      title: "احفظ العمل",
      description: "سيُحفظ كحالة حقيقية داخل Teachix.",
      primaryLabel: "حفظ ومتابعة",
    },
    CASE_EDIT: {
      target: "case-edit",
      title: "سجل عملك",
      description: "هذه بيانات العمل المحفوظة، ويمكن مراجعتها أو تعديلها.",
      primaryLabel: "التالي",
    },
    CASE_REPORT: {
      target: "case-report",
      title: "حوّله إلى تقرير",
      description: "افتح مسار التقرير المرتبط بهذا السجل.",
      primaryLabel: "إصدار التقرير",
    },
    REPORT_FIELDS: {
      target: "report-prepare-fields",
      title: "جهّز تقريرك",
      description: "هنا تقدر تعدّل العناوين والمحتوى على راحتك وبما يناسب تقريرك. الحقول المحددة هنا هي فقط التي ستظهر في التقرير.",
      primaryLabel: "التالي",
    },
    LUCKY20: {
      title: lucky20Reward ? "عرفت شيء جديد" : "خذ لك بريك",
      description: lucky20Reward ? "خذ خصم 20% إضافي على اشتراكك." : "تتوقع كم تقرير تقدر تنشئه في Teachix؟",
      primaryLabel: lucky20Reward ? "نكمل" : "",
      kind: "lucky20",
      lucky20Reward,
    },
    REPORT_DESCRIPTION: {
      target: "report-prepare-description",
      title: "الوصف التنفيذي",
      description: "الوصف التنفيذي يتم توليده تلقائيًا من بياناتك. تقدر تعدّله قبل المتابعة بما يناسب تقريرك.",
      primaryLabel: "معاينة التقرير",
    },
    REPORT_PREVIEW: {
      target: "studio-report-canvas",
      title: "باقي اللمسات الأخيرة",
      description: "عشان يكتمل التقرير، نضيف توقيعك وبيانات المدرسة مرة واحدة فقط.",
      primaryLabel: "إكمال الهوية",
    },
    SCHOOL_IDENTITY: {
      target: "teacher-school-identity",
      title: "هوية المدرسة",
      description: "أكمل البيانات الأساسية والتوقيع، وTeachix بيستخدمها تلقائيًا في تقاريرك القادمة.",
      primaryLabel: "التالي",
    },
    PRINCIPAL_NAME: {
      target: "teacher-principal-name",
      title: "اسم المدير",
      description: "راجع اسم مدير أو مديرة المدرسة قبل المتابعة.",
      primaryLabel: "التالي",
    },
    SIGNATURE: {
      target: "teacher-principal-signature-request",
      title: "طلب التوقيع",
      description: "أرسل الطلب، وسيظهر التوقيع تلقائيًا في التقارير بعد اعتماده.",
      primaryLabel: "إرسال طلب التوقيع",
    },
    RETURN_REPORT: {
      title: "جاهز للعودة",
      description: "الهوية والتوقيع صاروا جاهزين، وتقدر الآن تحفظ التقرير أو تحمّله. وتقدر ترسله للمدير للتوقيع إذا احتجت.",
      primaryLabel: "العودة للتقرير",
    },
    REFLECTED_IDENTITY: {
      target: "studio-report-canvas",
      title: "الهوية داخل التقرير",
      description: "تقريرك الآن جاهز للحفظ. إذا حبيت، تقدر ترسله للمدير للتوقيع من داخل المنصة.",
      primaryLabel: "التالي",
    },
    SAVE_REPORT: {
      target: "teacher-report-finalize",
      title: "احفظ التقرير",
      description: "احفظ التقرير، ويمكنك تنزيله من أدوات التقرير بعد ذلك.",
      primaryLabel: "حفظ التقرير",
    },
    SAVED_REPORT: {
      title: "تم حفظ التقرير",
      description: `${copy.created} تقريرك الأول، ويمكنك فتحه لاحقًا في أي وقت.`,
      primaryLabel: "شاهد ملف الإنجاز",
    },
    PORTFOLIO: {
      target: "teacher-portfolio-reports",
      title: "ملف إنجازك",
      description: "هنا تُجمع تقاريرك وأعمالك داخل ملف الإنجاز.",
      primaryLabel: "إنهاء الجولة",
    },
  };
  return cards[phase] || null;
}

export function getCaseIdFromJourneyPath(pathname: string) {
  return pathname.match(/^\/dashboard\/cases\/([^/]+)$/)?.[1] ||
    pathname.match(/^\/dashboard\/report-2\/cases\/([^/]+)\/(?:prepare|studio)$/)?.[1] ||
    null;
}

export function isTeacherPerformancePath(pathname: string) {
  return TEACHER_PERFORMANCE_SERVICES.some((service) => service.href === pathname);
}
