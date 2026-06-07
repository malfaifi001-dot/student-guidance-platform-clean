"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
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
};

const COLLAPSED_STORAGE_KEY = "student-guidance-sidebar-collapsed";

const counselorImportantLinks: SidebarLinkItem[] = [
  { label: "الرئيسية", href: "/dashboard", icon: Home },
  { label: "التقويم والتنبيهات", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "الحالات", href: "/dashboard/cases", icon: FolderKanban },
];

const counselorServiceLinks: SidebarLinkItem[] = [
  {
    label: "البرامج الإرشادية",
    href: "/dashboard/guidance-programs",
    icon: ClipboardList,
  },
  {
    label: "اللجان والاجتماعات",
    href: "/dashboard/committees-meetings",
    icon: ShieldCheck,
  },
  {
    label: "متابعة الطلاب",
    href: "/dashboard/student-follow-up",
    icon: Users,
  },
  {
    label: "الخدمات الإرشادية المقدمة للطلاب",
    href: "/dashboard/student-guidance-services",
    icon: FileText,
  },
  {
    label: "التقارير",
    href: "/dashboard/reports",
    icon: FileText,
  },
  {
    label: "المرجع الشامل للموجه الطلابي",
    href: "/dashboard/comprehensive-reference",
    icon: BookOpen,
  },
  {
    label: "تحليل النتائج",
    href: "/dashboard/results-analysis",
    icon: BarChart3,
  },
  {
    label: "التواصل بين الأسرة والمدرسة",
    href: "/dashboard/family-school-communication",
    icon: MessageCircle,
  },
];

const counselorToolsLinks: SidebarLinkItem[] = [
  { label: "رفع بيانات نور", href: "/dashboard/student-import", icon: UploadCloud },
];

const counselorAccountLinks: SidebarLinkItem[] = [
  { label: "الباقات", href: "/dashboard/plans", icon: WalletCards },
  { label: "حسابي", href: "/dashboard/account", icon: UserRound },
  { label: "إعدادات المدرسة", href: "/dashboard/settings/school", icon: School },
];

const adminMainLinks: SidebarLinkItem[] = [
  { label: "مركز الإدارة", href: "/dashboard/admin", icon: LayoutDashboard },
  { label: "المستخدمين", href: "/dashboard/admin/users", icon: Users },
  { label: "سجل العمليات", href: "/dashboard/admin/activity", icon: Activity },
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
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasActive(pathname: string, items: SidebarLinkItem[]) {
  return items.some((item) => isActivePath(pathname, item.href));
}

export function DashboardSidebar({ user }: { user?: SidebarUser | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  const isAdmin =
    user?.role === "ADMIN" || pathname.startsWith("/dashboard/admin");

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
        "hidden min-h-screen shrink-0 border-l border-slate-200 bg-white px-3 py-4 transition-all duration-300 xl:block",
        collapsed ? "w-[82px]" : "w-[236px]",
      ].join(" ")}
    >
      <div className="flex h-full flex-col">
        <div
          className={[
            "rounded-[1.6rem] border transition",
            collapsed
              ? "border-slate-100 bg-slate-50/70 p-2"
              : "border-transparent bg-transparent p-0",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-2">
            <Link
              href={isAdmin ? "/dashboard/admin" : "/dashboard"}
              className={[
                "flex min-w-0 items-center gap-3 rounded-[1.35rem] px-2 py-2 transition",
                collapsed ? "justify-center" : "flex-1",
                isAdmin ? "hover:bg-slate-50" : "hover:bg-sky-50/60",
              ].join(" ")}
              title={isAdmin ? "إدارة المنصة" : "التوجيه الطلابي"}
            >
              <div
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1",
                  isAdmin
                    ? "bg-slate-950 text-white ring-slate-900"
                    : "bg-sky-50 text-sky-600 ring-sky-100",
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
                  <h1 className="truncate text-[15px] font-black text-slate-950">
                    {isAdmin ? "إدارة المنصة" : "التوجيه الطلابي"}
                  </h1>
                  <p className="mt-1 truncate text-[11px] font-black text-slate-400">
                    {isAdmin ? "Admin Center" : "Counselor"}
                  </p>
                </div>
              ) : null}
            </Link>

            {!collapsed ? (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="تصغير القائمة"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="mx-auto mt-3 grid h-9 w-9 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="توسيع القائمة"
              title="توسيع القائمة"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {!collapsed ? (
          <div
            className={[
              "mx-2 mt-4 h-px",
              isAdmin ? "bg-slate-200" : "bg-sky-100",
            ].join(" ")}
          />
        ) : null}

        {isAdmin ? (
          <AdminSidebar pathname={pathname} collapsed={collapsed} />
        ) : (
          <CounselorSidebar pathname={pathname} collapsed={collapsed} />
        )}
      </div>
    </aside>
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

      {!collapsed ? (
        <div className="mt-4 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-4 text-xs leading-6 text-emerald-900">
          <p className="font-black">Admin Mode</p>
          <p className="mt-1 text-emerald-700">
            إدارة التفعيل، الاشتراكات، المدفوعات، الفواتير، النماذج، والتقارير.
          </p>
        </div>
      ) : null}
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
      <nav className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
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

      {!collapsed ? (
        <div className="mt-5 rounded-[1.35rem] border border-sky-100 bg-sky-50 p-4">
          <p className="text-xs font-black text-sky-700">اقتراح سريع</p>
          <p className="mt-2 text-xs font-bold leading-6 text-sky-700/80">
            ابدأ بالتقويم، ثم افتح الحالة أو المرجع الشامل عند الحاجة.
          </p>
        </div>
      ) : null}
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
        <p className="mb-2 px-3 text-[11px] font-black tracking-wide text-slate-400">
          {title}
        </p>
      ) : null}

      <div className="space-y-1">{children}</div>
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
    return <div className="space-y-1">{children}</div>;
  }

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={[
          "mb-2 flex w-full items-center justify-between rounded-2xl px-3 py-2 text-[11px] font-black tracking-wide transition",
          admin
            ? "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            : "text-slate-400 hover:bg-sky-50 hover:text-sky-700",
        ].join(" ")}
      >
        <span>{title}</span>
        <ChevronDown
          className={["h-4 w-4 transition", open ? "rotate-180" : ""].join(
            " "
          )}
        />
      </button>

      {open ? <div className="space-y-1">{children}</div> : null}
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

  return (
    <Link
      href={item.href}
      title={item.label}
      className={[
        "group relative flex items-center rounded-2xl transition",
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3",
        compact && !collapsed ? "py-2" : "py-2.5",
        active
          ? admin
            ? "bg-slate-950 text-white shadow-sm"
            : "bg-sky-50 text-sky-700 shadow-sm"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950",
      ].join(" ")}
    >
      {active ? (
        <span
          className={[
            "absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full",
            admin ? "bg-white" : "bg-sky-500",
          ].join(" ")}
        />
      ) : null}

      <div
        className={[
          "flex shrink-0 items-center justify-center rounded-xl transition",
          compact ? "h-8 w-8" : "h-9 w-9",
          active
            ? admin
              ? "bg-white/10 text-white"
              : "bg-white text-sky-600"
            : "bg-slate-100/70 text-slate-500 group-hover:bg-white group-hover:text-sky-600",
        ].join(" ")}
      >
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </div>

      {!collapsed ? (
        <span className="min-w-0 truncate text-[14px] font-black">
          {item.label}
        </span>
      ) : (
        <span className="pointer-events-none absolute right-[72px] z-50 hidden whitespace-nowrap rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-xl group-hover:block">
          {item.label}
        </span>
      )}
    </Link>
  );
}
