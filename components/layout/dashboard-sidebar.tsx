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
  { label: "الرئيسية", href: "/dashboard", icon: Home },
  { label: "الحالات", href: "/dashboard/cases", icon: FolderKanban },
  { label: "الطلاب", href: "/dashboard/students", icon: GraduationCap },
  { label: "التقارير", href: "/dashboard/reports", icon: FileText },
];

const managementLinks = [
  { label: "حسابي والجلسات", href: "/dashboard/account", icon: UserRound },
  { label: "إعدادات المدرسة", href: "/dashboard/settings/school", icon: Settings },
  { label: "لوحة الأدمن", href: "/dashboard/admin", icon: ShieldCheck },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-[264px] shrink-0 border-l border-slate-200/70 bg-white px-3 py-4 xl:block">
      <div className="flex h-full flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-[1.4rem] px-2 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Sparkles className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-base font-black text-slate-950">
              منصة التوجيه الطلابي
            </h1>
            <p className="mt-1 text-xs font-bold text-slate-400">
              Student Guidance
            </p>
          </div>
        </Link>

        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
          <SidebarSection title="نظرة عامة">
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

          <SidebarSection title="الإدارة">
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

        <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black text-slate-500">نصيحة اليوم</p>
          <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
            رتّب الشواهد قبل إصدار التقرير لتحصل على ملف PDF رسمي ونظيف.
          </p>
          <Link
            href="/dashboard/settings/school"
            className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-black text-sky-700 shadow-sm transition hover:bg-sky-50"
          >
            تحسين الهوية
          </Link>
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
      <p className="mb-2 px-3 text-[12px] font-black tracking-wide text-slate-400">
        {title}
      </p>

      <div className="space-y-1">{children}</div>
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
        "group flex items-center gap-3 rounded-2xl px-3 py-2 transition",
        active
          ? "bg-sky-50 text-sky-700"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
          active
            ? "bg-white text-sky-600 shadow-sm"
            : "bg-slate-100/70 text-slate-500 group-hover:bg-white group-hover:text-sky-600",
        ].join(" ")}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>

      <span className="min-w-0">
        <span className="block truncate text-[15px] font-black">{label}</span>

        {description ? (
          <span
            className={[
              "mt-0.5 block truncate text-[12px] font-bold",
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
