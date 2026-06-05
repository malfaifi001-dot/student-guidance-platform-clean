import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Database,
  FileSpreadsheet,
  UploadCloud,
} from "lucide-react";

import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";

export default async function DataCenterPage() {
  const context = await requireDashboardPageContext();

  if (!context.isAdmin && !context.schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
              <Database className="h-4 w-4" />
              Data Center
            </div>

            <h1 className="mt-4 text-4xl font-black leading-[1.25] text-slate-950">
              مركز بيانات المدرسة
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-500">
              هنا نجمع الرفع والاستيراد والمعالجة، مثل رفع نور وتحليل النتائج، بدل توزيعها في أكثر من مكان.
            </p>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-5 text-white">
            <p className="text-xs font-black text-slate-300">المرحلة الحالية</p>
            <p className="mt-2 text-2xl font-black">تجميع المسارات</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <CenterCard
          href="/dashboard/data-center/noor-import"
          icon={<UploadCloud className="h-6 w-6" />}
          title="رفع بيانات نور"
          helper="رفع وتحديث بيانات الطلاب من نور."
          action="فتح الرفع"
        />

        <CenterCard
          href="/dashboard/results-analysis"
          icon={<BarChart3 className="h-6 w-6" />}
          title="تحليل النتائج"
          helper="تحليل ملفات النتائج وربطها بالطلاب."
          action="فتح التحليل"
        />

        <article className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
            <FileSpreadsheet className="h-6 w-6" />
          </div>

          <h2 className="mt-5 text-xl font-black text-slate-950">
            رفع موحد لاحقًا
          </h2>

          <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
            المرحلة القادمة: ننقل واجهة رفع نور والمعالجة لتكون داخل Data Center مباشرة.
          </p>
        </article>
      </section>
    </main>
  );
}

function CenterCard({
  href,
  icon,
  title,
  helper,
  action,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  helper: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
        {icon}
      </div>

      <h2 className="mt-5 text-xl font-black text-slate-950">{title}</h2>

      <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
        {helper}
      </p>

      <span className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">
        {action}
        <ArrowLeft className="h-4 w-4" />
      </span>
    </Link>
  );
}
