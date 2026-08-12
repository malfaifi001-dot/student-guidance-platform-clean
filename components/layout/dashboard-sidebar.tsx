"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";

import { ACTIVITY_PROGRAM_DOMAINS } from "@/lib/activity-programs/activity-program-catalog";
import { TEACHER_PERFORMANCE_SERVICES } from "@/lib/teacher-performance/teacher-performance-services";
import { OFFICIAL_WORKSPACE_ROUTES } from "@/lib/workspace/workspace-modules";
import { TeachixLogo } from "@/components/brand/teachix-logo";

import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crown,
  Database,
  Dumbbell,
  FilePlus2,
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
  Palette,
  PenTool,
  PartyPopper,
  School,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  HandHeart,
  Compass,
  Clock3,
  UploadCloud,
  UserRound,
  Users,
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
    label: "الرئيسية",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "ملف إنجازي",
    href: "/dashboard/portfolio",
    icon: FolderKanban,
  },
  {
    label: "مركز الأنشطة",
    href: OFFICIAL_WORKSPACE_ROUTES.cases,
    icon: FolderKanban,
  },
  {
    label: "التقارير",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    icon: FileText,
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
    icon: ClipboardList,
  },
  {
    label: "اللجان والاجتماعات",
    href: "/dashboard/committees-meetings",
    icon: ShieldCheck,
  },
  {
    label: "متابعة الطلبة والمواقف اليومية الطارئة",
    href: "/dashboard/student-follow-up",
    icon: Users,
  },
  {
    label: "خدمات التوجيه الطلابي",
    href: "/dashboard/student-guidance-services",
    icon: FileText,
  },
  {
    label: "إشعار ولي الأمر",
    href: "/dashboard/guardian-summons",
    icon: UserRound,
  },
  {
    label: "تحليل النتائج",
    href: OFFICIAL_WORKSPACE_ROUTES.assessmentCenter,
    icon: BarChart3,
  },
  {
    label: "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
    href: "/dashboard/family-school-communication",
    icon: MessageCircle,
  },
  {
    label: "مكتبة الموجه الطلابي",
    href: "/dashboard/counselor-reference-library",
    icon: BookOpen,
  },
  {
    label: "مؤشرات التوجيه الطلابي للتقويم المدرسي والتقويم الخارجي",
    href: "/dashboard/student-guidance-evaluation-indicators",
    icon: Gauge,
  },
  {
    label: "الإحصائيات",
    href: "/dashboard/statistics",
    icon: BarChart3,
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
    icon: ClipboardList,
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
    label: "الأنشطة المصدرة",
    href: OFFICIAL_WORKSPACE_ROUTES.cases,
    icon: FolderKanban,
  },
  {
    label: "التقارير",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    icon: FileText,
  },
  {
    label: "التقويم والتنبيهات",
    href: "/dashboard/calendar",
    icon: CalendarDays,
  },
];

const activityProgramDomainLinks: SidebarLinkItem[] =
  ACTIVITY_PROGRAM_DOMAINS.map((domain) => ({
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
    }[domain.slug],
    shortLabel: domain.shortLabel,
  }));

const activityLeaderServiceLinks: SidebarLinkItem[] = [
  {
    label: "ملف إنجازي",
    href: "/dashboard/activity-leader/portfolio",
    icon: BriefcaseBusiness,
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
];

/* ============================================================
 * TEACHER
 * ============================================================ */

const teacherServiceLinks: SidebarLinkItem[] = [
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
    label: "التقارير",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    icon: FileText,
  },
  {
    label: "الإحصائيات",
    href: "/dashboard/statistics",
    icon: BarChart3,
  },
  {
    label: "التقويم والتنبيهات",
    href: "/dashboard/teacher/calendar",
    icon: CalendarDays,
  },
];

const teacherPerformanceLinks: SidebarLinkItem[] = [
  ...TEACHER_PERFORMANCE_SERVICES.map((service) => ({
    label: service.title,
    href: service.href,
    icon: ClipboardList,
    shortLabel: service.shortTitle,
  })),
  {
    label: "تقرير مخصص",
    href: "/dashboard/ai-report",
    icon: Sparkles,
  },
  {
    label: "التقرير الذكي التجريبي",
    href: "/dashboard/teacher/ai-report2",
    icon: BrainCircuit,
  },
  {
    label: "ملف إنجازي",
    href: "/dashboard/teacher/portfolio",
    icon: FolderKanban,
  },
];

const teacherAdditionalLinks: SidebarLinkItem[] = [
  {
    label: "رفع الطلاب",
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
    icon: ClipboardList,
  },
];

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
    label: "ملف إنجازي",
    href: "/dashboard/principal/portfolio",
    icon: FolderKanban,
  },
  {
    label: "منسوبو المدرسة",
    href: "/dashboard/principal/teachers",
    icon: Users,
  },
  {
    label: "الجدول الدراسي",
    href: "/dashboard/principal/timetable",
    icon: CalendarDays,
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
];

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
    label: "المستخدمين",
    href: "/dashboard/admin/users",
    icon: Users,
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
  {
    label: "Workflows",
    href: "/dashboard/admin/workflows",
    icon: GitBranch,
  },
];

const adminPaymentLinks: SidebarLinkItem[] = [
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
        title="الأهم"
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
        title="برامج النشاط"
        defaultOpen={pathname.startsWith(
          "/dashboard/activity-leader/programs",
        )}
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
        title="الأدوات الإضافية"
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
          pathname.startsWith("/dashboard/settings")
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
        title="الأهم"
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

      <SidebarSection
        title="الخدمات"
        collapsed={collapsed}
      >
        {counselorServiceLinks.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}
      </SidebarSection>

      <SidebarDropdown
        title="مركز التحليل والاختبارات"
        defaultOpen={pathname.startsWith(
          "/dashboard/assessment-center",
        )}
        collapsed={collapsed}
      >
        {assessmentCenterLinks.map((item) => (
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
        title="أدوات إضافية"
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
          pathname.startsWith("/dashboard/settings")
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
}: {
  pathname: string;
  collapsed: boolean;
}) {
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
        title="مركز التحليل والاختبارات"
        defaultOpen={pathname.startsWith(
          "/dashboard/assessment-center",
        )}
        collapsed={collapsed}
      >
        {assessmentCenterLinks.map((item) => (
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
        title="خدمات إضافية"
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
          pathname.startsWith("/dashboard/settings")
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
        title="الحساب والباقات"
        defaultOpen={
          pathname.startsWith("/dashboard/plans") ||
          pathname.startsWith("/dashboard/account") ||
          pathname.startsWith("/dashboard/settings")
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
