"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ACTIVITY_PROGRAM_DOMAINS } from "@/lib/activity-programs/activity-program-catalog";
import { OFFICIAL_WORKSPACE_ROUTES } from "@/lib/workspace/workspace-modules";
import { TEACHER_PERFORMANCE_SERVICES } from "@/lib/teacher-performance/teacher-performance-services";
import type { ComponentType, ReactNode } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crown,
  FilePlus2,
  FileText,
  FolderKanban,
  GitBranch,
  Home,
  KeyRound,
  LayoutDashboard,
  Medal,
  MessageCircle,
  PenTool,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

type SidebarUser = {
  role?: string | null;
  name?: string | null;
  officialName?: string | null;
};

type SidebarLinkItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  shortLabel?: string;
};

const COLLAPSED_STORAGE_KEY = "student-guidance-sidebar-collapsed";
const SIDEBAR_SCROLL_AREA_CLASS =
  "dashboard-sidebar-scroll mt-4 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-1 pb-4";

const counselorImportantLinks: SidebarLinkItem[] = [
  { label: "الرئيسية", href: "/dashboard", icon: Home },
  { label: "مركز الأنشطة", href: OFFICIAL_WORKSPACE_ROUTES.cases, icon: FolderKanban },
  { label: "التقارير", href: OFFICIAL_WORKSPACE_ROUTES.reports, icon: FileText },
  { label: "التقويم والتنبيهات", href: "/dashboard/calendar", icon: CalendarDays },
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
    shortLabel: "الإشعار",
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
    label: "الإحصائيات",
    href: "/dashboard/statistics",
    icon: BarChart3,
  },];


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
  { label: "رفع بيانات الطلاب", href: OFFICIAL_WORKSPACE_ROUTES.studentImport, icon: UploadCloud },
  { label: "الاستبيانات", href: OFFICIAL_WORKSPACE_ROUTES.surveys, icon: ClipboardList },
  { label: "الشهادات", href: OFFICIAL_WORKSPACE_ROUTES.certificates, icon: Medal },
];

const counselorAccountLinks: SidebarLinkItem[] = [
  { label: "الباقات", href: "/dashboard/plans", icon: WalletCards },
  { label: "حسابي", href: "/dashboard/account", icon: UserRound },
  { label: "إعدادات المدرسة", href: "/dashboard/settings/school", icon: School },
];

const activityLeaderImportantLinks: SidebarLinkItem[] = [
  { label: "الرئيسية", href: "/dashboard/activity-leader", icon: Home },
  { label: "مركز الأنشطة", href: OFFICIAL_WORKSPACE_ROUTES.cases, icon: FolderKanban, shortLabel: "الأنشطة" },
  { label: "البرامج والفعاليات", href: OFFICIAL_WORKSPACE_ROUTES.activityLeaderPrograms, icon: ClipboardList },
  { label: "خطط النشاط", href: "/dashboard/activity-leader/plans", icon: FolderKanban },
  { label: "التقويم والتنبيهات", href: "/dashboard/calendar", icon: CalendarDays },
];

const activityProgramDomainLinks: SidebarLinkItem[] = [
  {
    label: "كل برامج النشاط",
    href: OFFICIAL_WORKSPACE_ROUTES.activityLeaderPrograms,
    icon: ClipboardList,
    shortLabel: "البرامج",
  },
  ...ACTIVITY_PROGRAM_DOMAINS.map((domain) => ({
    label: domain.title,
    href: `/dashboard/activity-leader/programs/${domain.slug}`,
    icon: ClipboardList,
    shortLabel: domain.shortLabel,
  })),
];
const activityLeaderServiceLinks: SidebarLinkItem[] = [
  { label: "متابعة أنشطة المعلمين", href: "/dashboard/activity-leader/teacher-assignments", icon: ClipboardList, shortLabel: "المعلمون" },
  { label: "رفع بيانات الطلاب", href: OFFICIAL_WORKSPACE_ROUTES.studentImport, icon: UploadCloud, shortLabel: "رفع الطلاب" },
  { label: "الاستبيانات", href: "/dashboard/activity-leader/surveys", icon: ClipboardList },
  { label: "الشهادات", href: OFFICIAL_WORKSPACE_ROUTES.certificates, icon: Medal },
  { label: "المشاركات الطلابية", href: "/dashboard/activity-leader/participations", icon: Users },
  { label: "الشواهد والمرفقات", href: "/dashboard/activity-leader/evidence", icon: UploadCloud },
  { label: "التقارير", href: OFFICIAL_WORKSPACE_ROUTES.reports, icon: FileText },
  { label: "تقرير خاص", href: "/dashboard/custom-report", icon: Sparkles },
];

const activityLeaderAccountLinks: SidebarLinkItem[] = [
  { label: "الباقات", href: "/dashboard/plans", icon: WalletCards },
  { label: "حسابي", href: "/dashboard/account", icon: UserRound },
  { label: "إعدادات المدرسة", href: "/dashboard/settings/school", icon: School },
];

const teacherServiceLinks: SidebarLinkItem[] = [
  { label: "الرئيسية", href: OFFICIAL_WORKSPACE_ROUTES.teacherHome, icon: Home },
  { label: "الحالات", href: OFFICIAL_WORKSPACE_ROUTES.cases, icon: FolderKanban },
  { label: "التقارير", href: OFFICIAL_WORKSPACE_ROUTES.reports, icon: FileText },
  { label: "الإحصائيات", href: "/dashboard/statistics", icon: BarChart3 },
  { label: "التقويم والتنبيهات", href: "/dashboard/teacher/calendar", icon: CalendarDays },
  ];

const teacherPerformanceLinks: SidebarLinkItem[] = [
  ...TEACHER_PERFORMANCE_SERVICES.map((service) => ({
    label: service.title,
    href: service.href,
    icon: ClipboardList,
    shortLabel: service.shortTitle,
  })),
  { label: "تقرير مخصص", href: "/dashboard/ai-report", icon: Sparkles, shortLabel: "مخصص" },
  { label: "التقرير الذكي التجريبي", href: "/dashboard/teacher/ai-report2", icon: BrainCircuit, shortLabel: "تجريبي" },
  { label: "ملف إنجازي", href: "/dashboard/teacher/portfolio", icon: FolderKanban, shortLabel: "إنجازي" },
];

const teacherAdditionalLinks: SidebarLinkItem[] = [
  { label: "رفع الطلاب", href: OFFICIAL_WORKSPACE_ROUTES.studentImport, icon: UploadCloud },
  { label: "الشهادات", href: OFFICIAL_WORKSPACE_ROUTES.certificates, icon: Medal },
  { label: "الاستبيانات", href: OFFICIAL_WORKSPACE_ROUTES.surveys, icon: ClipboardList },
];

const teacherAccountLinks: SidebarLinkItem[] = [
  { label: "الباقات", href: "/dashboard/subscription", icon: WalletCards },
  { label: "حسابي", href: "/dashboard/account", icon: UserRound },
  { label: "إعدادات المدرسة", href: "/dashboard/settings/school", icon: School },
];
const principalLinks: SidebarLinkItem[] = [
  { label: "الرئيسية", href: "/dashboard/principal", icon: Home },
  { label: "منسوبو المدرسة", href: "/dashboard/principal/teachers", icon: Users },
  { label: "School Timetable", href: "/dashboard/principal/timetable", icon: CalendarDays },
  { label: "الحالات", href: OFFICIAL_WORKSPACE_ROUTES.cases, icon: FolderKanban },
  { label: "التقارير", href: OFFICIAL_WORKSPACE_ROUTES.reports, icon: FileText },
];
const principalAccountLinks: SidebarLinkItem[] = [
  { label: "الباقات", href: "/dashboard/plans", icon: WalletCards },
  { label: "حسابي", href: "/dashboard/account", icon: UserRound },
  { label: "إعدادات المدرسة", href: "/dashboard/settings/school", icon: School },
];
const adminMainLinks: SidebarLinkItem[] = [
  { label: "مركز الإدارة", href: "/dashboard/admin", icon: LayoutDashboard },
  { label: "صحة النظام", href: "/dashboard/admin/system-health", icon: Activity },
  { label: "المستخدمين", href: "/dashboard/admin/users", icon: Users },
  { label: "سجل العمليات", href: "/dashboard/admin/activity", icon: Activity },
  { label: "الاستبيانات", href: "/dashboard/admin/surveys", icon: ClipboardList },
  {
    label: "إدارة مكتبة الموجه الطلابي",
    href: "/dashboard/admin/counselor-reference-library",
    icon: BookOpen,
  },
  { label: "التفعيلات", href: "/dashboard/admin/activations", icon: KeyRound },
  { label: "الاشتراكات", href: "/dashboard/admin/subscriptions", icon: Crown },
  { label: "المشتركين", href: "/dashboard/admin/subscribers", icon: Users },
  { label: "Workflows", href: "/dashboard/admin/workflows", icon: GitBranch },
];

const adminPaymentLinks: SidebarLinkItem[] = [
  { label: "عمليات الدفع", href: "/dashboard/admin/payments", icon: WalletCards },
  { label: "مزودو الدفع", href: "/dashboard/admin/payments/providers", icon: WalletCards },
  { label: "التسوية المالية", href: "/dashboard/admin/payments/reconciliation", icon: WalletCards },
  { label: "الفواتير", href: "/dashboard/admin/payments/invoices", icon: FileText },
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
  { label: "حساب الأدمن", href: "/dashboard/account", icon: UserRound },
  { label: "هوية المنصة", href: "/dashboard/settings/school", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/principal") return pathname === "/dashboard/principal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasActive(pathname: string, items: SidebarLinkItem[]) {
  return items.some((item) => isActivePath(pathname, item.href));
}

const collapsedLabelByLabel: Record<string, string> = {
  "الرئيسية": "الرئيسية",
  "الحالات": "الحالات",
  "مركز الأنشطة": "الأنشطة",
  "متابعة أنشطة المعلمين": "المعلمون",
  "التقارير": "التقارير",
  "تقرير خاص": "خاص",
  "تقرير مخصص": "مخصص",
  "التقويم والتنبيهات": "التقويم",

  "برامج التوجيه الطلابي": "البرامج",
  "اللجان والاجتماعات": "اللجان",
  "متابعة الطلبة والمواقف اليومية الطارئة": "المتابعة",
  "خدمات التوجيه الطلابي": "التوجيه",
  "مكتبة الموجه الطلابي": "المكتبة",
  "الإحصائيات": "إحصائيات",
  "تحليل النتائج": "التحليل",
  "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور": "الأسرة",

  "لوحة المركز": "المركز",
  "تحليل جديد": "تحليل جديد",
  "التحليلات السابقة": "السابقة",
  "تحليل المواد": "المواد",
  "تحليل الصفوف والفصول": "الصفوف",
  "الطلاب المعرضون للخطر": "الخطر",
  "التوصيات العلاجية": "التوصيات",
  "تقارير التحليل": "تقارير",

  "رفع بيانات الطلاب": "رفع الطلاب",
  "الباقات": "الباقات",
  "حسابي": "حسابي",
  "إعدادات المدرسة": "المدرسة",

  "مركز الإدارة": "الإدارة",
  "صحة النظام": "الصحة",
  "المستخدمين": "المستخدمون",
  "سجل العمليات": "السجل",
  "التفعيلات": "التفعيلات",
  "الاشتراكات": "الاشتراكات",
  "المشتركين": "المشتركون",
  "Workflows": "Workflows",

  "عمليات الدفع": "الدفع",
  "مزودو الدفع": "المزودون",
  "التسوية المالية": "التسوية",
  "الفواتير": "الفواتير",
  "إعدادات الفواتير والضريبة": "الضريبة",

  "مصمم Workflow": "المصمم",
  "قوالب التقارير": "القوالب",
  "قالب تقرير جديد": "قالب جديد",
  "حساب الأدمن": "حساب الأدمن",
  "هوية المنصة": "الهوية",
};

function getCollapsedLabel(item: SidebarLinkItem) {
  return item.shortLabel || collapsedLabelByLabel[item.label] || item.label;
}

export function DashboardSidebar({ user }: { user?: SidebarUser | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  const isAdmin =
    user?.role === "ADMIN" || pathname.startsWith("/dashboard/admin");
  const isActivityLeader =
    user?.role === "ACTIVITY_LEADER" ||
    pathname.startsWith("/dashboard/activity-leader");
  const isTeacher =
    user?.role === "TEACHER" || pathname.startsWith("/dashboard/teacher");
  const isPrincipal =
    user?.role === "PRINCIPAL" || pathname.startsWith("/dashboard/principal");

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
useEffect(() => {
    const savedValue = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
    setCollapsed(savedValue === "true");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
  }, [collapsed, ready]);

  return (
    <aside
      className={[
        "sticky top-0 hidden h-screen shrink-0 overflow-hidden bg-transparent py-4 transition-all duration-300 md:block xl:py-5",
        collapsed ? "w-[92px] px-2 lg:w-[96px] xl:w-[104px] xl:px-3" : "w-[232px] px-2 lg:w-[280px] lg:px-3 xl:w-[320px] xl:px-4",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-950/92 dark:shadow-black/30",
          collapsed ? "p-2" : "p-4",
        ].join(" ")}
      >
        <div
          className={[
            "flex shrink-0 items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800",
            collapsed ? "justify-center" : "justify-between",
          ].join(" ")}
        >
          <Link
            href={dashboardHomeHref}
            className={[
              "flex min-w-0 items-center rounded-[1.35rem] transition",
              collapsed ? "justify-center p-1" : "flex-1 gap-3 px-2 py-2",
              isAdmin
                ? "hover:bg-slate-50 dark:hover:bg-slate-900"
                : "hover:bg-sky-50/60 dark:hover:bg-sky-500/10",
            ].join(" ")}
            title={dashboardTitle}
          >
            <div
              className={[
                "flex shrink-0 items-center justify-center rounded-2xl ring-1",
                collapsed ? "h-11 w-11" : "h-12 w-12",
                isAdmin
                  ? "bg-slate-950 text-white ring-slate-900 dark:bg-white dark:text-slate-950 dark:ring-slate-200"
                  : "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/20",
              ].join(" ")}
            >
              {isAdmin ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>

            {!collapsed ? (
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-black text-slate-950 dark:text-white">
                  {dashboardTitle}
                </h1>
                <p className="mt-1 truncate text-[11px] font-black text-slate-400 dark:text-slate-500">
                  {dashboardSubtitle}
                </p>
              </div>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
            title={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
          >
            {collapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        {isAdmin ? (
          <AdminSidebar pathname={pathname} collapsed={collapsed} />
        ) : isActivityLeader ? (
          <ActivityLeaderSidebar pathname={pathname} collapsed={collapsed} />
        ) : isTeacher ? (
          <TeacherSidebar pathname={pathname} collapsed={collapsed} />
        ) : isPrincipal ? (
          <PrincipalSidebar pathname={pathname} collapsed={collapsed} />
        ) : (
          <CounselorSidebar pathname={pathname} collapsed={collapsed} />
        )}
      </div>
    </aside>
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
    <nav
      className={[
        SIDEBAR_SCROLL_AREA_CLASS,
        collapsed ? "space-y-1.5 px-1" : "space-y-5 pr-1",
      ].join(" ")}
      aria-label="قائمة مدير المدرسة"
    >
      <SidebarSection title="مساحة مدير المدرسة" collapsed={collapsed}>
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
        defaultOpen={pathname.startsWith("/dashboard/plans") || pathname.startsWith("/dashboard/account") || pathname.startsWith("/dashboard/settings")}
        collapsed={collapsed}
      >
        {principalAccountLinks.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActivePath(pathname, item.href)} compact collapsed={collapsed} />
        ))}
      </SidebarDropdown>
    </nav>
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
    <>
      <nav
        className={[
          SIDEBAR_SCROLL_AREA_CLASS,
          collapsed ? "space-y-1.5 px-1" : "space-y-5 pr-1",
        ].join(" ")}
      >
        <SidebarSection title="الإدارة" collapsed={collapsed}>
          {adminMainLinks.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              admin
              collapsed={collapsed}
            />
          ))}
        </SidebarSection>

        <SidebarDropdown
          title="المدفوعات"
          defaultOpen={pathname.startsWith("/dashboard/admin/payments")}
          admin
          collapsed={collapsed}
        >
          {adminPaymentLinks.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              admin
              compact
              collapsed={collapsed}
            />
          ))}
        </SidebarDropdown>

        <SidebarDropdown
          title="أدوات البناء"
          defaultOpen={hasActive(pathname, adminBuilderLinks)}
          admin
          collapsed={collapsed}
        >
          {adminBuilderLinks.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              admin
              compact
              collapsed={collapsed}
            />
          ))}
        </SidebarDropdown>

        <SidebarDropdown
          title="الحساب والإعدادات"
          defaultOpen={hasActive(pathname, adminAccountLinks)}
          admin
          collapsed={collapsed}
        >
          {adminAccountLinks.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              admin
              compact
              collapsed={collapsed}
            />
          ))}
        </SidebarDropdown>
      </nav>
    </>
  );
}

function ActivityLeaderSidebar({
  pathname,
  collapsed,
}: {
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <>
      <nav
        className={[
          SIDEBAR_SCROLL_AREA_CLASS,
          collapsed ? "space-y-1.5 px-1" : "space-y-5 pr-1",
        ].join(" ")}
      >
        <SidebarSection title="الأهم" collapsed={collapsed}>
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
          defaultOpen={pathname.startsWith("/dashboard/activity-leader/programs")}
          collapsed={collapsed}
        >
          {activityProgramDomainLinks.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={
                item.href === "/dashboard/activity-leader/programs"
                  ? pathname === item.href
                  : isActivePath(pathname, item.href)
              }
              compact
              collapsed={collapsed}
            />
          ))}
        </SidebarDropdown>

        <SidebarSection title="إدارة النشاط" collapsed={collapsed}>
          {activityLeaderServiceLinks.map((item) => (
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
          {activityLeaderAccountLinks.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              compact
              collapsed={collapsed}
            />
          ))}
        </SidebarDropdown>
      </nav>
    </>
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
    <>
      <nav
        className={[
          SIDEBAR_SCROLL_AREA_CLASS,
          collapsed ? "space-y-1.5 px-1" : "space-y-5 pr-1",
        ].join(" ")}
      >
        <SidebarSection title="مساحة المعلم" collapsed={collapsed}>
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
          defaultOpen={teacherPerformanceLinks.some((item) => isActivePath(pathname, item.href))}
          collapsed={collapsed}
        >
          {teacherPerformanceLinks.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              compact
              collapsed={collapsed}
            />
          ))}
        </SidebarDropdown>

        <SidebarDropdown
          title="مركز التحليل والاختبارات"
          defaultOpen={pathname.startsWith("/dashboard/assessment-center")}
          collapsed={collapsed}
        >
          {assessmentCenterLinks.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={
                item.href === "/dashboard/assessment-center"
                  ? pathname === item.href
                  : isActivePath(pathname, item.href)
              }
              compact
              collapsed={collapsed}
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
              compact
              collapsed={collapsed}
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
              compact
              collapsed={collapsed}
            />
          ))}
        </SidebarDropdown>
      </nav>
    </>
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
    <>
      <nav
        className={[
          SIDEBAR_SCROLL_AREA_CLASS,
          collapsed ? "space-y-1.5 px-1" : "space-y-5 pr-1",
        ].join(" ")}
      >
        <SidebarSection title="الأهم" collapsed={collapsed}>
          {counselorImportantLinks.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              collapsed={collapsed}
            />
          ))}
        </SidebarSection>

        <SidebarSection title="الخدمات" collapsed={collapsed}>
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
          defaultOpen={pathname.startsWith("/dashboard/assessment-center")}
          collapsed={collapsed}
        >
          {assessmentCenterLinks.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={
                item.href === "/dashboard/assessment-center"
                  ? pathname === item.href
                  : isActivePath(pathname, item.href)
              }
              compact
              collapsed={collapsed}
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
              compact
              collapsed={collapsed}
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
              compact
              collapsed={collapsed}
            />
          ))}
        </SidebarDropdown>
      </nav>
    </>
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
        <p className="mb-2 px-3 text-[11px] font-black tracking-wide text-slate-400 dark:text-slate-500">
          {title}
        </p>
      ) : null}

      <div className={collapsed ? "space-y-1.5" : "space-y-1.5"}>{children}</div>
    </section>
  );
}

function SidebarDropdown({
  title,
  children,
  defaultOpen = false,
  admin,
  collapsed,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  admin?: boolean;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (collapsed) {
    return <div className="space-y-1.5">{children}</div>;
  }

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={[
          "mb-2 flex w-full items-center justify-between rounded-2xl px-3 py-2 text-[11px] font-black tracking-wide transition",
          admin
            ? "text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            : "text-slate-400 hover:bg-sky-50 hover:text-sky-700 dark:text-slate-500 dark:hover:bg-sky-500/10 dark:hover:text-sky-200",
        ].join(" ")}
      >
        <span>{title}</span>
        <ChevronDown
          className={["h-4 w-4 transition", open ? "rotate-180" : ""].join(
            " "
          )}
        />
      </button>

      {open ? <div className="space-y-1.5">{children}</div> : null}
    </section>
  );
}

function SidebarLink({
  item,
  active,
  admin,
  compact,
  collapsed,
}: {
  item: SidebarLinkItem;
  active: boolean;
  admin?: boolean;
  compact?: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const collapsedLabel = getCollapsedLabel(item);

  return (
    <Link
      href={item.href}
      title={item.label}
      className={[
        "group relative flex items-center rounded-2xl transition",
        collapsed
          ? "min-h-[66px] flex-col justify-center gap-1 px-1 py-1.5 text-center"
          : "min-h-11 gap-3 px-4 py-2.5",
        compact && !collapsed ? "py-2" : "",
        active
          ? admin
            ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
            : "bg-sky-50 text-sky-700 shadow-sm dark:bg-sky-500/15 dark:text-sky-200 dark:ring-1 dark:ring-sky-400/20"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
      ].join(" ")}
    >
      {active && !collapsed ? (
        <span
          className={[
            "absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full",
            admin ? "bg-white dark:bg-slate-950" : "bg-sky-500",
          ].join(" ")}
        />
      ) : null}

      <div
        className={[
          "flex shrink-0 items-center justify-center rounded-xl transition",
          collapsed ? "h-9 w-9" : compact ? "h-8 w-8" : "h-9 w-9",
          active
            ? admin
              ? "bg-white/10 text-white dark:bg-slate-950/10 dark:text-slate-950"
              : "bg-white text-sky-600 dark:bg-sky-400/15 dark:text-sky-200"
            : "bg-slate-100/70 text-slate-500 group-hover:bg-white group-hover:text-sky-600 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:bg-slate-800 dark:group-hover:text-sky-300",
        ].join(" ")}
      >
        <Icon className={collapsed ? "h-5 w-5" : compact ? "h-4 w-4" : "h-5 w-5"} />
      </div>

      {!collapsed ? (
        <span className="min-w-0 flex-1 whitespace-normal break-words text-right text-[14px] font-black leading-6">
          {item.label}
        </span>
      ) : (
        <>
          <span className="line-clamp-2 max-w-[64px] text-center text-[9px] font-black leading-[11px] text-current">
            {collapsedLabel}
          </span>

          <span className="pointer-events-none fixed right-[112px] z-50 hidden whitespace-nowrap rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-xl group-hover:block dark:border dark:border-slate-700 dark:bg-slate-900">
            {item.label}
          </span>
        </>
      )}
    </Link>
  );
}
