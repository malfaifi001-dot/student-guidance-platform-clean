import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  Home,
  MessageCircle,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { dashboardServices } from "@/lib/constants/services";
import { cn } from "@/lib/utils";

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

export function DashboardSidebar() {
  return (
    <aside className="hidden min-h-screen w-80 border-l border-slate-200 bg-white/90 p-5 lg:block">
      <div className="mb-8 rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-500 p-5 text-white shadow-lg">
        <p className="text-sm opacity-90">منصة</p>
        <h1 className="mt-1 text-2xl font-bold">التوجيه الطلابي</h1>
        <p className="mt-2 text-sm opacity-90">نظام مدرسي ذكي للموجه والموجهة الطلابية</p>
      </div>

      <nav className="space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
        >
          <Home className="h-5 w-5" />
          الرئيسية
        </Link>

        <div className="pt-4">
          <p className="mb-2 px-4 text-xs font-bold text-slate-400">الخدمات</p>
          {dashboardServices.map((service) => {
            const Icon = iconMap[service.slug] ?? FileText;

            return (
              <Link
                key={service.slug}
                href={service.href}
                className={cn(
                  "group flex items-start gap-3 rounded-2xl px-4 py-3 transition",
                  "text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                )}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  <span className="block text-sm font-semibold">{service.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-400 group-hover:text-sky-500">
                    {service.kind === "workflow" ? "Workflow Runtime" : "خدمة مستقلة"}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="pt-4">
          <p className="mb-2 px-4 text-xs font-bold text-slate-400">الإدارة</p>
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
          >
            <Settings className="h-5 w-5" />
            لوحة الأدمن
          </Link>
        </div>
      </nav>
    </aside>
  );
}