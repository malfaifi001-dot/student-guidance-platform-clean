"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";

import { ACTIVITY_PROGRAM_DOMAINS } from "@/lib/activity-programs/activity-program-catalog";
import { TEACHER_PERFORMANCE_SERVICES } from "@/lib/teacher-performance/teacher-performance-services";
import { STUDENT_ACTIVITY_COMPETITIONS_SERVICE } from "@/lib/activity-competitions/activity-competitions-service";
import { PRINCIPAL_PERFORMANCE_ITEMS } from "@/lib/principal/performance-items";
import { PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES } from "@/lib/principal/evaluation-accreditation-services";
import { OFFICIAL_WORKSPACE_ROUTES } from "@/lib/workspace/workspace-modules";
import { SCHOOL_ACTIVITY_TEAM_SERVICE } from "@/lib/activity-team/activity-team-config";
import { TeachixLogo } from "@/components/brand/teachix-logo";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { getStudentAudienceLabels } from "@/lib/students/student-audience-labels";

import {
  Activity,
  Award,
  BarChart3,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ClipboardCheck,
  Crown,
  Database,
  Dumbbell,
  FilePlus2,
  FileCheck2,
  FileText,
  FlaskConical,
  FolderKanban,
  Gauge,
  GitBranch,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Medal,
  MessageCircle,
  MonitorCog,
  NotebookPen,
  Palette,
  PenTool,
  PartyPopper,
  Radio,
  School,
  Send,
  Settings,
  ShieldCheck,
  Shuffle,
  Sparkles,
  HandHeart,
  Compass,
  Clock3,
  UploadCloud,
  UserRound,
  Users,
  UsersRound,
  TrendingUp,
  Video,
  WalletCards,
  X,
} from "lucide-react";

type SidebarUser = {
  role?: string | null;
  name?: string | null;
  officialName?: string | null;
  jobTitle?: string | null;
  gender?: string | null;
  schoolAccount?: {
    profile?: {
      logoUrl?: string | null;
    } | null;
  } | null;
};

type SidebarLinkItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  shortLabel?: string;
};

const COLLAPSED_STORAGE_KEY = "student-guidance-sidebar-collapsed";

const HOME_ROUTES = new Set([
  "/dashboard",
  "/dashboard/admin",
  "/dashboard/activity-leader",
  "/dashboard/teacher",
  "/dashboard/principal",
]);

/* ============================================================
 * COUNSELOR
 * ============================================================ */

const counselorImportantLinks: SidebarLinkItem[] = [
  {
    label: "تكليفاتي",
    href: "/dashboard/assignments",
    icon: ClipboardCheck,
  },
  {
    label: "الرئيسية",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "التقويم والتنبيهات",
    href: "/dashboard/calendar",
    icon: CalendarDays,
  },
];

const counselorServiceLinks: SidebarLinkItem[] = [
  {
    label: "برامج التوجيه الطلابي",
    href: "/dashboard/guidance-programs",
    icon: Sparkles,
  },
  {
    label: "اللجان والاجتماعات",
    href: "/dashboard/committees-meetings",
    icon: UsersRound,
  },
  {
    label: "متابعة الطلبة والمواقف اليومية الطارئة",
    href: "/dashboard/student-follow-up",
    icon: Users,
  },
  {
    label: "خدمات التوجيه الطلابي",
    href: "/dashboard/student-guidance-services",
    icon: HandHeart,
  },
  {
    label: "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
    href: "/dashboard/family-school-communication",
    icon: MessageCircle,
  },
  {
    label: "مؤشرات التوجيه الطلابي للتقويم المدرسي والتقويم الخارجي",
    href: "/dashboard/student-guidance-evaluation-indicators",
    icon: Gauge,
  },
  {
    label: "المكتبة الشاملة",
    href: "/dashboard/counselor-reference-library",
    icon: BookOpen,
  },
  {
    label: "إشعار ولي الأمر",
    href: "/dashboard/guardian-summons",
    icon: MessageCircle,
  },
  {
    label: "الإحصائيات",
    href: "/dashboard/statistics",
    icon: Activity,
  },
  {
    label: "ملف الإنجاز",
    href: "/dashboard/portfolio",
    icon: BriefcaseBusiness,
  },
];

const assessmentCenterLinks: SidebarLinkItem[] = [
  {
    label: "لوحة المركز",
    href: OFFICIAL_WORKSPACE_ROUTES.assessmentCenter,
    icon: BarChart3,
  },
  {
    label: "ربط الطلاب",
    href: "/dashboard/assessment-center/linking",
    icon: GitBranch,
  },
];

const counselorAssessmentCenterLinks: SidebarLinkItem[] = [
  ...assessmentCenterLinks,
  {
    label: "الموجه الذكي",
    href: "/dashboard/assessment-center/smart-counselor",
    icon: Sparkles,
  },
];

const counselorToolsLinks: SidebarLinkItem[] = [
  {
    label: "رفع بيانات الطلاب",
    href: OFFICIAL_WORKSPACE_ROUTES.studentImport,
    icon: UploadCloud,
  },
  {
    label: "الاستبيانات",
    href: OFFICIAL_WORKSPACE_ROUTES.surveys,
    icon: ListChecks,
  },
  {
    label: "الشهادات",
    href: OFFICIAL_WORKSPACE_ROUTES.certificates,
    icon: Medal,
  },
];

const counselorAccountLinks: SidebarLinkItem[] = [
  {
    label: "الباقات",
    href: "/dashboard/plans",
    icon: WalletCards,
  },
  {
    label: "حسابي",
    href: "/dashboard/account",
    icon: UserRound,
  },
  {
    label: "إعدادات المدرسة",
    href: "/dashboard/settings/school",
    icon: School,
  },
  {
    label: "الدعم والمساعدة",
    href: "/dashboard/support",
    icon: MessageCircle,
  },
];

/* ============================================================
 * ACTIVITY LEADER
 * ============================================================ */

const activityLeaderImportantLinks: SidebarLinkItem[] = [
  {
    label: "الرئيسية",
    href: "/dashboard/activity-leader",
    icon: Home,
  },
  {
    label: "الحالات",
    href: OFFICIAL_WORKSPACE_ROUTES.cases,
    icon: FolderKanban,
  },
  {
    label: "التقارير المعتمدة",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    icon: FileCheck2,
  },
  {
    label: "التقويم والتنبيهات",
    href: "/dashboard/calendar",
    icon: CalendarDays,
  },
];

const activityProgramDomainLinks: SidebarLinkItem[] = [
  {
    label: SCHOOL_ACTIVITY_TEAM_SERVICE.title,
    href: SCHOOL_ACTIVITY_TEAM_SERVICE.href,
    icon: UsersRound,
  },
  {
    label: "خطة النشاط الطلابي",
    href: "/dashboard/activity-leader/activity-plan",
    icon: CalendarDays,
  },
  ...ACTIVITY_PROGRAM_DOMAINS.map((domain) => ({
    label: domain.title,
    href: `/dashboard/activity-leader/programs/${domain.slug}`,
    icon: {
      "citizenship-life": HandHeart,
      "science-technology": FlaskConical,
      "culture-arts": Palette,
      "sports-health": Dumbbell,
      scouting: Compass,
      "events-occasions": PartyPopper,
      "non-class-periods": Clock3,
      "school-broadcast": Radio,
    }[domain.slug],
    shortLabel: domain.shortLabel,
  })),
  {
    label: STUDENT_ACTIVITY_COMPETITIONS_SERVICE.title,
    href: STUDENT_ACTIVITY_COMPETITIONS_SERVICE.href,
    icon: Award,
  },
  {
    label: "ملف الإنجاز",
    href: "/dashboard/activity-leader/portfolio",
    icon: BriefcaseBusiness,
  },
];

const activityLeaderServiceLinks: SidebarLinkItem[] = [
  {
    label: "تكليفاتي",
    href: "/dashboard/activity-leader/assignments",
    icon: ClipboardCheck,
  },
  {
    label: "متابعة أنشطة المعلمين",
    href: "/dashboard/activity-leader/teacher-assignments",
    icon: Send,
  },
  {
    label: "رفع بيانات الطلاب",
    href: OFFICIAL_WORKSPACE_ROUTES.studentImport,
    icon: Database,
  },
  {
    label: "الاستبيانات",
    href: "/dashboard/activity-leader/surveys",
    icon: ListChecks,
  },
  {
    label: "الشهادات",
    href: OFFICIAL_WORKSPACE_ROUTES.certificates,
    icon: Award,
  },
];

const activityLeaderAccountLinks: SidebarLinkItem[] = [
  {
    label: "الباقات",
    href: "/dashboard/plans",
    icon: WalletCards,
  },
  {
    label: "حسابي",
    href: "/dashboard/account",
    icon: UserRound,
  },
  {
    label: "إعدادات المدرسة",
    href: "/dashboard/settings/school",
    icon: School,
  },
  {
    label: "الدعم والمساعدة",
    href: "/dashboard/support",
    icon: MessageCircle,
  },
];

/* ============================================================
 * TEACHER
 * ============================================================ */

const teacherServiceLinks: SidebarLinkItem[] = [
  {
    label: "تكليفاتي",
    href: "/dashboard/teacher/assignments",
    icon: ClipboardCheck,
  },
  {
    label: "الرئيسية",
    href: OFFICIAL_WORKSPACE_ROUTES.teacherHome,
    icon: Home,
  },
  {
    label: "الحالات",
    href: OFFICIAL_WORKSPACE_ROUTES.cases,
    icon: FolderKanban,
  },
  {
    label: "التقارير المعتمدة",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    icon: FileCheck2,
  },
  {
    label: "توزيع المنهج",
    href: "/dashboard/teacher/curriculum-distribution",
    icon: BookOpen,
  },
  {
    label: "التقويم والتنبيهات",
    href: "/dashboard/teacher/calendar",
    icon: CalendarDays,
  },
];

const teacherPerformanceIcons: Record<
  string,
  SidebarLinkItem["icon"]
> = {
  job_duties_performance: ListChecks,
  professional_community_interaction: Users,
  parents_interaction: MessageCircle,
  teaching_strategies_diversity: Shuffle,
  learner_results_improvement: TrendingUp,
  learning_plan_preparation: NotebookPen,
  learning_technology_tools: MonitorCog,
  learning_environment: School,
  classroom_management: UsersRound,
  learner_results_analysis: BarChart3,
  assessment_methods_diversity: ShieldCheck,
};

const teacherPerformanceLinks: SidebarLinkItem[] = [
  ...TEACHER_PERFORMANCE_SERVICES.map((service) => ({
    label: service.title,
    href: service.href,
    icon: teacherPerformanceIcons[service.slug] ?? ListChecks,
    shortLabel: service.shortTitle,
  })),
  {
    label: "ملف الإنجاز",
    href: "/dashboard/teacher/portfolio",
    icon: FolderKanban,
  },
];

function getTeacherAdditionalLinks(gender?: string | null): SidebarLinkItem[] {
  const labels = getStudentAudienceLabels(gender);
  return [
  {
    label: "تحليل نتائج الطلاب",
    href: "/dashboard/assessments-center",
    icon: BarChart3,
  },
  {
    label: "الإحصائيات",
    href: "/dashboard/statistics",
    icon: BarChart3,
  },
  {
    label: labels.uploadStudents,
    href: OFFICIAL_WORKSPACE_ROUTES.studentImport,
    icon: UploadCloud,
  },
  {
    label: "الشهادات",
    href: OFFICIAL_WORKSPACE_ROUTES.certificates,
    icon: Medal,
  },
  {
    label: "الاستبيانات",
    href: OFFICIAL_WORKSPACE_ROUTES.surveys,
    icon: ListChecks,
  },
  ];
}

const teacherAccountLinks: SidebarLinkItem[] = [
  {
    label: "الباقات",
    href: "/dashboard/subscription",
    icon: WalletCards,
  },
  {
    label: "حسابي",
    href: "/dashboard/account",
    icon: UserRound,
  },
  {
    label: "إعدادات المدرسة",
    href: "/dashboard/settings/school",
    icon: School,
  },
  {
    label: "الدعم والمساعدة",
    href: "/dashboard/support",
    icon: MessageCircle,
  },
];

/* ============================================================
 * PRINCIPAL
 * ============================================================ */

const principalLinks: SidebarLinkItem[] = [
  {
    label: "الرئيسية",
    href: "/dashboard/principal",
    icon: Home,
  },
  {
    label: "منسوبو المدرسة",
    href: "/dashboard/principal/teachers",
    icon: Users,
  },
  {
    label: "الحالات",
    href: OFFICIAL_WORKSPACE_ROUTES.cases,
    icon: FolderKanban,
  },
  {
    label: "التقارير",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    icon: FileText,
  },
  {
    label: "ملف الإنجاز",
    href: "/dashboard/principal/portfolio",
    icon: FolderKanban,
  },
];

const principalTimetableLinks: SidebarLinkItem[] = [
  {
    label: "الجدول الدراسي",
    href: "/dashboard/timetable-v3",
    icon: CalendarDays,
  },
  {
    label: "حصص الانتظار",
    href: "/dashboard/timetable-v3/operations",
    icon: CalendarClock,
  },
];

const principalPerformanceLinks: SidebarLinkItem[] = PRINCIPAL_PERFORMANCE_ITEMS.map(
  (item) => ({
    label: item.title,
    href: item.href,
    icon: ClipboardList,
    shortLabel: item.shortTitle,
  }),
);

const principalEvaluationAccreditationLinks: SidebarLinkItem[] =
  PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES.map((service) => ({
    label: service.title,
    href: service.href,
    icon: ShieldCheck,
    shortLabel: service.shortTitle,
  }));

const principalAccountLinks: SidebarLinkItem[] = [
  {
    label: "الباقات",
    href: "/dashboard/plans",
    icon: WalletCards,
  },
  {
    label: "حسابي",
    href: "/dashboard/account",
    icon: UserRound,
  },
  {
    label: "إعدادات المدرسة",
    href: "/dashboard/settings/school",
    icon: School,
  },
  {
    label: "الدعم والمساعدة",
    href: "/dashboard/support",
    icon: MessageCircle,
  },
];

/* ============================================================
 * ADMIN
 * ============================================================ */

const adminMainLinks: SidebarLinkItem[] = [
  {
    label: "مركز الإدارة",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
  },
  {
    label: "صحة النظام",
    href: "/dashboard/admin/system-health",
    icon: Activity,
  },
  {
    label: "الإشعارات والبوش",
    href: "/dashboard/admin/notifications",
    icon: BellRing,
  },
  {
    label: "المستخدمين",
    href: "/dashboard/admin/users",
    icon: Users,
  },
  {
    label: "واتساب المستخدمين",
    href: "/dashboard/admin/user-whatsapp",
    icon: MessageCircle,
  },
  {
    label: "سجل العمليات",
    href: "/dashboard/admin/activity",
    icon: Activity,
  },
  {
    label: "الاستبيانات",
    href: "/dashboard/admin/surveys",
    icon: ClipboardList,
  },
  {
    label: "إدارة مكتبة الموجه الطلابي",
    href: "/dashboard/admin/counselor-reference-library",
    icon: BookOpen,
  },
  {
    label: "الفيديوهات الإرشادية",
    href: "/dashboard/admin/guidance-videos",
    icon: Video,
  },
  {
    label: "التفعيلات",
    href: "/dashboard/admin/activations",
    icon: KeyRound,
  },
  {
    label: "الاشتراكات",
    href: "/dashboard/admin/subscriptions",
    icon: Crown,
  },
  {
    label: "العروض والكوبونات",
    href: "/dashboard/admin/promotions",
    icon: PartyPopper,
  },
  {
    label: "المشتركين",
    href: "/dashboard/admin/subscribers",
    icon: Users,
  },
];

const adminWorkflowRoleLinks: SidebarLinkItem[] = [
  {
    label: "الموجه الطلابي",
    href: "/dashboard/admin/workflows/counselor",
    icon: Compass,
  },
  {
    label: "رائد النشاط",
    href: "/dashboard/admin/workflows/activity-leader",
    icon: Activity,
  },
  {
    label: "المعلم",
    href: "/dashboard/admin/workflows/teacher",
    icon: BookOpen,
  },
  {
    label: "مدير المدرسة",
    href: "/dashboard/admin/workflows/principal",
    icon: School,
  },
];

const adminPaymentLinks: SidebarLinkItem[] = [
  {
    label: "المحاسبة والمصروفات",
    href: "/dashboard/admin/accounting",
    icon: WalletCards,
  },
  {
    label: "عمليات الدفع",
    href: "/dashboard/admin/payments",
    icon: WalletCards,
  },
  {
    label: "مزودو الدفع",
    href: "/dashboard/admin/payments/providers",
    icon: WalletCards,
  },
  {
    label: "التسوية المالية",
    href: "/dashboard/admin/payments/reconciliation",
    icon: WalletCards,
  },
  {
    label: "الفواتير",
    href: "/dashboard/admin/payments/invoices",
    icon: FileText,
  },
  {
    label: "إعدادات الفواتير والضريبة",
    href: "/dashboard/admin/payments/invoice-settings",
    icon: Settings,
  },
];

const adminBuilderLinks: SidebarLinkItem[] = [
  {
    label: "مصمم Workflow",
    href: "/dashboard/admin/workflow-builder",
    icon: PenTool,
  },
  {
    label: "قوالب التقارير",
    href: "/dashboard/admin/report-templates",
    icon: FileText,
  },
  {
    label: "قالب تقرير جديد",
    href: "/dashboard/admin/report-templates/new",
    icon: FilePlus2,
  },
];

const adminAccountLinks: SidebarLinkItem[] = [
  {
    label: "حساب الأدمن",
    href: "/dashboard/account",
    icon: UserRound,
  },
  {
    label: "هوية المنصة",
    href: "/dashboard/settings/school",
    icon: Settings,
  },
];

/* ============================================================
 * HELPERS
 * ============================================================ */

function isActivePath(pathname: string, href: string) {
  if (HOME_ROUTES.has(href)) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasActive(pathname: string, items: SidebarLinkItem[]) {
  return items.some((item) => isActivePath(pathname, item.href));
}

function getRoleLabel(role?: string | null) {
  if (role === "ADMIN") return "مدير النظام";
  if (role === "ACTIVITY_LEADER") return "رائد النشاط";
  if (role === "TEACHER") return "المعلم";
  if (role === "PRINCIPAL") return "مدير المدرسة";
  return "الموجه الطلابي";
}

/* ============================================================
 * ROOT SIDEBAR
 * ============================================================ */

export function DashboardSidebar({
  user,
  subscription,
  mode = "permanent",
  onClose,
}: {
  user?: SidebarUser | null;
  subscription?: {
    planName: string;
    statusText: string;
  };
  mode?: "permanent" | "drawer";
  onClose?: () => void;
}) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const isStudioContext = pathname.includes("/studio");
  const normalCollapsedRef = useRef(false);
  const wasStudioRef = useRef(isStudioContext);

  const isAdmin =
    user?.role === "ADMIN" ||
    pathname.startsWith("/dashboard/admin");

  const isActivityLeader =
    user?.role === "ACTIVITY_LEADER" ||
    pathname.startsWith("/dashboard/activity-leader");

  const isTeacher =
    user?.role === "TEACHER" ||
    pathname.startsWith("/dashboard/teacher");

  const isPrincipal =
    user?.role === "PRINCIPAL" ||
    pathname.startsWith("/dashboard/principal");

  const dashboardHomeHref = isAdmin
    ? "/dashboard/admin"
    : isActivityLeader
      ? OFFICIAL_WORKSPACE_ROUTES.activityLeaderHome
      : isTeacher
        ? OFFICIAL_WORKSPACE_ROUTES.teacherHome
        : isPrincipal
          ? "/dashboard/principal"
          : OFFICIAL_WORKSPACE_ROUTES.counselorHome;

  const dashboardTitle = isAdmin
    ? "إدارة المنصة"
    : isActivityLeader
      ? "ريادة النشاط"
      : isTeacher
        ? "مساحة المعلم"
        : isPrincipal
          ? "إدارة المدرسة"
          : "التوجيه الطلابي";

  const dashboardSubtitle = isAdmin
    ? "Admin Center"
    : isActivityLeader
      ? "Activity Leader"
      : isTeacher
        ? "Teacher Workspace"
        : isPrincipal
          ? "Principal Workspace"
          : "Counselor";

  const displayName =
    user?.officialName ||
    user?.name ||
    "حسابي";

  const roleLabel =
    user?.jobTitle ||
    getRoleLabel(user?.role);

  const avatar =
    user?.schoolAccount?.profile?.logoUrl ||
    (user?.gender === "FEMALE"
      ? "/uploads/VD/girl.png"
      : "/uploads/VD/boy.png");

  useEffect(() => {
    const savedValue =
      window.localStorage.getItem(COLLAPSED_STORAGE_KEY);

    normalCollapsedRef.current = savedValue === "true";
    const tabletQuery = window.matchMedia(
      "(min-width: 768px) and (max-width: 1179px)",
    );
    const tablet = tabletQuery.matches;
    setCollapsed(
      mode === "drawer"
        ? false
        : isStudioContext || tablet
          ? true
          : normalCollapsedRef.current,
    );
    setReady(true);

    if (mode === "drawer") return;

    const handleTabletChange = (event: MediaQueryListEvent) => {
      setCollapsed(
        isStudioContext || event.matches
          ? true
          : normalCollapsedRef.current,
      );
    };

    tabletQuery.addEventListener("change", handleTabletChange);
    return () => tabletQuery.removeEventListener("change", handleTabletChange);
  }, [isStudioContext, mode]);

  useEffect(() => {
    if (!ready || wasStudioRef.current === isStudioContext) return;

    if (isStudioContext) {
      normalCollapsedRef.current = collapsed;
      setCollapsed(true);
    } else {
      const tablet = window.matchMedia(
        "(min-width: 768px) and (max-width: 1179px)",
      ).matches;
      setCollapsed(tablet ? true : normalCollapsedRef.current);
    }

    wasStudioRef.current = isStudioContext;
  }, [collapsed, isStudioContext, ready]);

  useEffect(() => {
    if (
      !ready ||
      isStudioContext ||
      mode === "drawer" ||
      window.innerWidth < 1180
    ) return;

    normalCollapsedRef.current = collapsed;

    window.localStorage.setItem(
      COLLAPSED_STORAGE_KEY,
      String(collapsed),
    );
  }, [collapsed, isStudioContext, mode, ready]);

  const effectiveCollapsed = mode === "drawer" ? false : collapsed;

  return (
    <aside
      className={[
        "h-screen shrink-0 bg-transparent transition-[width] duration-300",
        mode === "drawer" ? "block w-full p-2" : "sticky top-0 hidden md:block",
        effectiveCollapsed
          ? "w-[84px] px-2 py-3 min-[1180px]:w-[88px]"
          : mode === "drawer"
            ? ""
            : "w-[252px] px-2.5 py-3 min-[1180px]:w-[294px] min-[1180px]:px-3",
      ].join(" ")}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl dark:border-slate-800/90 dark:bg-[#0c1422]/96 dark:shadow-[0_20px_60px_rgba(0,0,0,0.32)]">

        <SidebarHeader
          collapsed={effectiveCollapsed}
          dashboardHomeHref={dashboardHomeHref}
          dashboardTitle={dashboardTitle}
          dashboardSubtitle={dashboardSubtitle}
          onToggle={() => setCollapsed((value) => !value)}
          drawer={mode === "drawer"}
          onClose={onClose}
        />

        <div className="min-h-0 flex-1 px-2 pb-2 pt-2">
          {isAdmin ? (
            <AdminSidebar
              pathname={pathname}
              collapsed={effectiveCollapsed}
            />
          ) : isActivityLeader ? (
            <ActivityLeaderSidebar
              pathname={pathname}
              collapsed={effectiveCollapsed}
            />
          ) : isTeacher ? (
            <TeacherSidebar
              pathname={pathname}
              collapsed={effectiveCollapsed}
              gender={user?.gender}
            />
          ) : isPrincipal ? (
            <PrincipalSidebar
              pathname={pathname}
              collapsed={effectiveCollapsed}
            />
          ) : (
            <CounselorSidebar
              pathname={pathname}
              collapsed={effectiveCollapsed}
            />
          )}
        </div>

        <SidebarProfile
          collapsed={effectiveCollapsed}
          displayName={
            isAdmin
              ? displayName
              : subscription?.planName || "لا توجد باقة مفعلة"
          }
          roleLabel={
            isAdmin
              ? roleLabel
              : subscription?.statusText || "اختر باقة للمتابعة"
          }
          avatar={avatar}
          avatarAlt={displayName}
        />
      </div>
    </aside>
  );
}

/* ============================================================
 * HEADER
 * ============================================================ */

function SidebarHeader({
  collapsed,
  dashboardHomeHref,
  dashboardTitle,
  dashboardSubtitle,
  onToggle,
  drawer = false,
  onClose,
}: {
  collapsed: boolean;
  dashboardHomeHref: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  onToggle: () => void;
  drawer?: boolean;
  onClose?: () => void;
}) {
  return (
    <div
      className={[
        "shrink-0 border-b border-slate-100 dark:border-slate-800/80",
        collapsed ? "px-2 py-3" : "px-3 py-3.5",
      ].join(" ")}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-3">
          <Link
            href={dashboardHomeHref}
            title={dashboardTitle}
            className="grid h-11 w-11 place-items-center transition opacity-95 hover:opacity-100"
          >
            <TeachixLogo iconOnly className="w-8" />
          </Link>

          <button
            type="button"
            onClick={drawer ? onClose : onToggle}
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:bg-white/[0.04] dark:text-slate-500 dark:hover:bg-white/[0.08] dark:hover:text-white"
            aria-label="توسيع القائمة"
            title="توسيع القائمة"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href={dashboardHomeHref}
            title={dashboardTitle}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
          >
            <TeachixLogo iconOnly className="w-9" />

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[15px] font-black text-slate-950 dark:text-white">
                {dashboardTitle}
              </h2>

              <p className="mt-0.5 truncate text-[10px] font-black tracking-wide text-slate-400 dark:text-slate-500">
                {dashboardSubtitle}
              </p>
            </div>
          </Link>

          {drawer ? <ThemeToggleButton compact /> : null}

          <button
            type="button"
            onClick={drawer ? onClose : onToggle}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:bg-white/[0.04] dark:text-slate-500 dark:hover:bg-white/[0.08] dark:hover:text-white"
            aria-label={drawer ? "إغلاق القائمة" : "تصغير القائمة"}
            title={drawer ? "إغلاق القائمة" : "تصغير القائمة"}
          >
            {drawer ? (
              <X className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * PROFILE
 * ============================================================ */

function SidebarProfile({
  collapsed,
  displayName,
  roleLabel,
  avatar,
  avatarAlt,
}: {
  collapsed: boolean;
  displayName: string;
  roleLabel: string;
  avatar: string;
  avatarAlt: string;
}) {
  return (
    <div
      className={[
        "shrink-0 border-t border-slate-100 dark:border-slate-800/80",
        collapsed ? "p-2.5" : "p-3",
      ].join(" ")}
    >
      <Link
        href="/dashboard/account"
        title={collapsed ? `${displayName} - ${roleLabel}` : undefined}
        className={[
          "group flex items-center rounded-[18px] border border-transparent transition",
          collapsed
            ? "justify-center p-1"
            : "gap-2.5 px-2.5 py-2",
          "hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-white/[0.035]",
        ].join(" ")}
      >
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-sky-50 ring-2 ring-sky-100 dark:bg-sky-500/10 dark:ring-sky-400/20">
          <img
            src={avatar}
            alt={avatarAlt}
            className="h-full w-full object-cover"
          />

          <span className="absolute bottom-0 left-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#0c1422]" />
        </div>

        {!collapsed ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-black text-slate-900 dark:text-white">
                {displayName}
              </p>

              <p className="mt-0.5 truncate text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {roleLabel}
              </p>
            </div>

            <ChevronDown className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
          </>
        ) : null}
      </Link>
    </div>
  );
}

/* ============================================================
 * ROLE SIDEBARS
 * ============================================================ */

function ActivityLeaderSidebar({
  pathname,
  collapsed,
}: {
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <SidebarNav ariaLabel="قائمة رائد النشاط">
      <SidebarSection
        title="مساحة رائد النشاط"
        collapsed={collapsed}
      >
        {activityLeaderImportantLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}
      </SidebarSection>

      <SidebarDropdown
        title="الأنشطة"
        defaultOpen={pathname.startsWith(
          "/dashboard/activity-leader/programs",
        ) || pathname.startsWith("/dashboard/activity-leader/activity-team") || pathname.startsWith("/dashboard/activity-leader/activity-plan")}
        collapsed={collapsed}
      >
        {activityProgramDomainLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="الخدمات الإضافية"
        defaultOpen={hasActive(pathname, activityLeaderServiceLinks)}
        collapsed={collapsed}
      >
        {activityLeaderServiceLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="الحساب والباقات"
        defaultOpen={
          pathname.startsWith("/dashboard/plans") ||
          pathname.startsWith("/dashboard/account") ||
          pathname.startsWith("/dashboard/settings") ||
          pathname.startsWith("/dashboard/support")
        }
        collapsed={collapsed}
      >
        {activityLeaderAccountLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>
    </SidebarNav>
  );
}

function CounselorSidebar({
  pathname,
  collapsed,
}: {
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <SidebarNav ariaLabel="قائمة الموجه الطلابي">
      <SidebarSection
        title="مساحة الموجه الطلابي"
        collapsed={collapsed}
      >
        {counselorImportantLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}
      </SidebarSection>

      <SidebarDropdown
        title="الخدمات"
        defaultOpen={hasActive(pathname, counselorServiceLinks)}
        collapsed={collapsed}
      >
        {counselorServiceLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="مركز تحليل النتائج"
        defaultOpen={pathname.startsWith(
          "/dashboard/assessment-center",
        )}
        collapsed={collapsed}
      >
        {counselorAssessmentCenterLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="الخدمات الإضافية"
        defaultOpen={hasActive(pathname, counselorToolsLinks)}
        collapsed={collapsed}
      >
        {counselorToolsLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="الحساب والباقات"
        defaultOpen={
          pathname.startsWith("/dashboard/plans") ||
          pathname.startsWith("/dashboard/account") ||
          pathname.startsWith("/dashboard/settings") ||
          pathname.startsWith("/dashboard/support")
        }
        collapsed={collapsed}
      >
        {counselorAccountLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>
    </SidebarNav>
  );
}

function TeacherSidebar({
  pathname,
  collapsed,
  gender,
}: {
  pathname: string;
  collapsed: boolean;
  gender?: string | null;
}) {
  const teacherAdditionalLinks = getTeacherAdditionalLinks(gender);
  return (
    <SidebarNav ariaLabel="قائمة المعلم">
      <SidebarSection
        title="مساحة المعلم"
        collapsed={collapsed}
      >
        {teacherServiceLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}
      </SidebarSection>

      <SidebarDropdown
        title="تقييم أداء المعلم"
        defaultOpen={hasActive(pathname, teacherPerformanceLinks)}
        collapsed={collapsed}
      >
        {teacherPerformanceLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="الأدوات الإضافية"
        defaultOpen={hasActive(pathname, teacherAdditionalLinks)}
        collapsed={collapsed}
      >
        {teacherAdditionalLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="الحساب والباقات"
        defaultOpen={
          pathname.startsWith("/dashboard/subscription") ||
          pathname.startsWith("/dashboard/account") ||
          pathname.startsWith("/dashboard/settings") ||
          pathname.startsWith("/dashboard/support")
        }
        collapsed={collapsed}
      >
        {teacherAccountLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>
    </SidebarNav>
  );
}

function PrincipalSidebar({
  pathname,
  collapsed,
}: {
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <SidebarNav ariaLabel="قائمة مدير المدرسة">
      <SidebarSection
        title="مساحة مدير المدرسة"
        collapsed={collapsed}
      >
        {principalLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}
      </SidebarSection>

      <SidebarDropdown
        title="الجدول الدراسي"
        defaultOpen={
          pathname.startsWith("/dashboard/principal/timetable") ||
          pathname.startsWith("/dashboard/timetable-v3")
        }
        collapsed={collapsed}
      >
        {principalTimetableLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={item.href === "/dashboard/timetable-v3"
              ? pathname === item.href
              : isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="عناصر التقييم"
        defaultOpen={hasActive(pathname, principalPerformanceLinks)}
        collapsed={collapsed}
      >
        {principalPerformanceLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="التقويم والاعتماد المدرسي"
        defaultOpen={hasActive(pathname, principalEvaluationAccreditationLinks)}
        collapsed={collapsed}
      >
        {principalEvaluationAccreditationLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="الحساب والباقات"
        defaultOpen={
          pathname.startsWith("/dashboard/plans") ||
          pathname.startsWith("/dashboard/account") ||
          pathname.startsWith("/dashboard/settings") ||
          pathname.startsWith("/dashboard/support")
        }
        collapsed={collapsed}
      >
        {principalAccountLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
          />
        ))}
      </SidebarDropdown>
    </SidebarNav>
  );
}

function AdminSidebar({
  pathname,
  collapsed,
}: {
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <SidebarNav ariaLabel="قائمة إدارة المنصة">
      <SidebarSection
        title="الإدارة"
        collapsed={collapsed}
      >
        {adminMainLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            admin
          />
        ))}
      </SidebarSection>

      <SidebarDropdown
        title="Workflows"
        defaultOpen={pathname.startsWith("/dashboard/admin/workflows")}
        collapsed={collapsed}
        admin
      >
        {adminWorkflowRoleLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
            admin
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="المدفوعات"
        defaultOpen={pathname.startsWith(
          "/dashboard/admin/payments",
        )}
        collapsed={collapsed}
        admin
      >
        {adminPaymentLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
            admin
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="أدوات البناء"
        defaultOpen={hasActive(pathname, adminBuilderLinks)}
        collapsed={collapsed}
        admin
      >
        {adminBuilderLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
            admin
          />
        ))}
      </SidebarDropdown>

      <SidebarDropdown
        title="الحساب والإعدادات"
        defaultOpen={hasActive(pathname, adminAccountLinks)}
        collapsed={collapsed}
        admin
      >
        {adminAccountLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            compact
            admin
          />
        ))}
      </SidebarDropdown>
    </SidebarNav>
  );
}

/* ============================================================
 * SHARED UI
 * ============================================================ */

function SidebarNav({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="dashboard-sidebar-scroll h-full min-h-0 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-1 pb-3"
    >
      {children}
    </nav>
  );
}

function SidebarSection({
  title,
  children,
  collapsed,
}: {
  title: string;
  children: ReactNode;
  collapsed: boolean;
}) {
  return (
    <section>
      {!collapsed ? (
        <p className="mb-1.5 px-3 text-[10px] font-black tracking-wide text-slate-400 dark:text-slate-500">
          {title}
        </p>
      ) : null}

      <div className="space-y-1">
        {children}
      </div>
    </section>
  );
}

function SidebarDropdown({
  title,
  children,
  defaultOpen = false,
  collapsed,
  admin = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  collapsed: boolean;
  admin?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);

  useEffect(() => {
    if (!open || collapsed) return;

    const frameId = window.requestAnimationFrame(() => {
      const section = sectionRef.current;
      const scrollContainer = section?.closest<HTMLElement>(
        ".dashboard-sidebar-scroll",
      );

      if (!section || !scrollContainer) return;

      const sectionRect = section.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const visibilityPadding = 8;

      if (sectionRect.bottom > containerRect.bottom - visibilityPadding) {
        scrollContainer.scrollTo({
          top:
            scrollContainer.scrollTop +
            sectionRect.bottom -
            containerRect.bottom +
            visibilityPadding,
          behavior: "smooth",
        });
      } else if (sectionRect.top < containerRect.top + visibilityPadding) {
        scrollContainer.scrollTo({
          top:
            scrollContainer.scrollTop +
            sectionRect.top -
            containerRect.top -
            visibilityPadding,
          behavior: "smooth",
        });
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [open, collapsed]);

  if (collapsed) {
    return (
      <section className="space-y-1 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0 dark:border-slate-800/70">
        {children}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="border-t border-slate-100 pt-2.5 first:border-t-0 first:pt-0 dark:border-slate-800/70"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={[
          "mb-1 flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-[10px] font-black tracking-wide transition",
          admin
            ? "text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
            : "text-slate-400 hover:bg-sky-50/70 hover:text-sky-700 dark:text-slate-500 dark:hover:bg-sky-500/[0.07] dark:hover:text-sky-300",
        ].join(" ")}
      >
        <span>
          {title}
        </span>

        <ChevronDown
          className={[
            "h-3.5 w-3.5 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div className="space-y-1">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
  compact = false,
  admin = false,
}: {
  item: SidebarLinkItem;
  active: boolean;
  collapsed: boolean;
  compact?: boolean;
  admin?: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex items-center border border-transparent transition-all duration-200",
        collapsed
          ? "mx-auto h-11 w-11 justify-center rounded-[15px]"
          : compact
            ? "min-h-[38px] gap-2 rounded-[14px] px-2.5 py-1.5"
            : "min-h-[40px] gap-2.5 rounded-[15px] px-2.5 py-1.5",
        active
          ? admin
            ? "border-slate-950 bg-slate-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950"
            : "border-sky-100 bg-sky-50 text-sky-700 shadow-[0_5px_14px_rgba(14,165,233,0.07)] dark:border-sky-400/10 dark:bg-sky-400/[0.09] dark:text-sky-300"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.04] dark:hover:text-white",
      ].join(" ")}
    >
      {active ? (
        <span
          aria-hidden="true"
          className={[
            "absolute right-0 top-1/2 w-[3px] -translate-y-1/2 rounded-full",
            collapsed ? "h-5" : "h-6",
            admin
              ? "bg-white dark:bg-slate-950"
              : "bg-sky-500",
          ].join(" ")}
        />
      ) : null}

      <span
        className={[
          "grid shrink-0 place-items-center rounded-xl transition-all duration-200",
          collapsed
            ? "h-9 w-9"
            : compact
              ? "h-7.5 w-7.5"
              : "h-8 w-8",
          active
            ? admin
              ? "bg-white/10 text-white dark:bg-slate-950/10 dark:text-slate-950"
              : "bg-white text-sky-600 shadow-sm dark:bg-sky-400/10 dark:text-sky-300"
            : "bg-slate-50 text-slate-400 group-hover:text-sky-600 dark:bg-white/[0.025] dark:text-slate-400 dark:group-hover:text-sky-300",
        ].join(" ")}
      >
        <Icon
          className={
            compact && !collapsed
              ? "h-4 w-4"
              : "h-[18px] w-[18px]"
          }
        />
      </span>

      {!collapsed ? (
        <span
          className={[
            "min-w-0 flex-1 text-right font-black",
            compact
              ? "text-[12px] leading-5"
              : "text-[12.5px] leading-5",
          ].join(" ")}
        >
          {item.label}
        </span>
      ) : null}
    </Link>
  );
}
