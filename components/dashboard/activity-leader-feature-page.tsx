import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";

type Props = {
  title: string;
  description: string;
  badge: string;
};

export async function ActivityLeaderFeaturePage({
  title,
  description,
  badge,
}: Props) {
  const current = await requireDashboardUser();

  if (current.user.role !== "ACTIVITY_LEADER") {
    redirect(getDashboardHomePath(current.user.role));
  }

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
            {badge}
          </span>

          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
            قيد البناء المنظم
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-black leading-10 text-slate-950">
          {title}
        </h1>

        <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
          {description}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard title="نفس التصميم" description="سيتم بناء الصفحة بنفس كروت وألوان لوحة رائد النشاط." />
          <InfoCard title="تدرج آمن" description="نبدأ بالهيكل ثم نضيف النماذج والـ APIs حسب الأولوية." />
          <InfoCard title="جاهزة للربط" description="المسار موجود الآن حتى لا تكون روابط السايدبار مكسورة." />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/dashboard/activity-leader"
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-800"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للوحة رائد النشاط
          </Link>

          <Link
            href="/dashboard/calendar"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <CalendarDays className="h-4 w-4" />
            فتح التقويم
          </Link>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
        <CheckCircle2 className="h-5 w-5" />
      </div>

      <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
        {description}
      </p>
    </article>
  );
}