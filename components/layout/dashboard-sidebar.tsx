"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  FolderKanban,
  GraduationCap,
  Home,
  LayoutGrid,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { dashboardServices } from "@/lib/constants/services";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "guidance-programs": ClipboardList,
  "student-follow-up": Users,
  "committees-meetings": ShieldCheck,
  "family-school-communication": MessageCircle,
  "student-guidance-services": FileText,
  "comprehensive-reference": BookOpen,
  "results-analysis": BarChart3,
  reports: FileText,
};

const primaryLinks = [
  {
    label: "الرئيسية",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "مركز الحالات",
    href: "/dashboard/cases",
    icon: FolderKanban,
  },
  {
    label: "الطلاب",
    href: "/dashboard/students",
    icon: GraduationCap,
  },
  {
    label: "التقارير",
    href: "/dashboard/reports",
    icon: FileText,
  },
];

const managementLinks = [
  {
    label: "حسابي والجلسات",
    href: "/dashboard/account",
    icon: UserRound,
  },
  {
    label: "إعدادات المدرسة",
    href: "/dashboard/settings/school",
    icon: Settings,
  },
  {
    label: "لوحة الأدمن",
    href: "/dashboard/admin",
    icon: ShieldCheck,
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-[292px] shrink-0 border-l border-slate-200/70 bg-white/90 px-4 py-5 backdrop-blur-xl xl:block">
      <div className="flex h-full flex-col">
        <Link
          href="/dashboard"
          className="group relative overflow-hidden rounded-[1.8rem] border border-sky-100 bg-gradient-to-br from-sky-500 to-cyan-500 p-5 text-white shadow-xl shadow-sky-100/70"
        >
          <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-12 right-10 h-28 w-28 rounded-full bg-slate-950/10 blur-2xl" />

          <div className="relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Sparkles className="h-6 w-6" />
            </div>

            <h1 className="mt-4 text-2xl font-black tracking-tight">
              التوجيه الطلابي
            </h1>

            <p className="mt-2 text-sm font-bold leading-7 text-sky-50">
              نظام مدرسي ذكي للموجه والموجهة الطلابية
            </p>
          </div>
        </Link>

        <nav className="mt-6 flex-1 space-y-7 overflow-y-auto pr-1">
          <SidebarSection title="العمل اليومي">
            {primaryLinks.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActivePath(pathname, item.href)}
              />
            ))}
          </SidebarSection>

          <SidebarSection title="الخدمات">
            {dashboardServices.map((service) => {
              const Icon = iconMap[service.slug] ?? LayoutGrid;

              return (
                <SidebarLink
                  key={service.slug}
                  href={service.href}
                  label={service.title}
                  icon={Icon}
                  active={isActivePath(pathname, service.href)}
                  description={
                    service.kind === "workflow"
                      ? "Workflow Runtime"
                      : "خدمة مستقلة"
                  }
                />
              );
            })}
          </SidebarSection>

          <SidebarSection title="الإدارة والحساب">
            {managementLinks.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActivePath(pathname, item.href)}
              />
            ))}
          </SidebarSection>
        </nav>

        <div className="mt-5 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-black text-slate-500">جاهزية المنصة</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-l from-sky-300 to-blue-500" />
          </div>
          <p className="mt-3 text-xs font-bold leading-6 text-slate-500">
            أكمل هوية المدرسة والشعار لتحصل على تقارير رسمية أجمل.
          </p>
        </div>
      </div>
    </aside>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-2 px-3 text-[11px] font-black tracking-wide text-slate-400">
        {title}
      </p>

      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  description,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-3 rounded-2xl px-3 py-3 transition",
        active
          ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-100"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition",
          active
            ? "bg-white text-sky-600 shadow-sm"
            : "bg-slate-100/70 text-slate-500 group-hover:bg-white group-hover:text-sky-600 group-hover:shadow-sm",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </div>

      <span className="min-w-0">
        <span className="block truncate text-sm font-black">{label}</span>

        {description ? (
          <span
            className={[
              "mt-0.5 block truncate text-[11px] font-bold",
              active ? "text-sky-500" : "text-slate-400",
            ].join(" ")}
          >
            {description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
