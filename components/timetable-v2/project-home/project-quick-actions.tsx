import Link from "next/link";

import type {
  ProjectDashboardData,
} from "@/lib/timetable-v2/project-dashboard-types";

function ActionCard({
  title,
  description,
  cta,
  href,
}: {
  title: string;
  description: string;
  cta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-slate-900">
          {title}
        </div>

        <div className="mt-0.5 text-xs leading-5 text-slate-500">
          {description}
        </div>
      </div>

      <span className="shrink-0 text-xs font-black text-sky-700 transition group-hover:translate-x-1">
        {cta}
      </span>
    </Link>
  );
}

export function ProjectQuickActions({
  data,
}: {
  data: ProjectDashboardData;
}) {
  const base = `/dashboard/timetable-v2/${data.project.id}`;

  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 lg:p-6">
      <h2 className="text-lg font-black text-slate-950">
        إجراءات سريعة
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ActionCard
          title="إدارة المعلمين"
          description="أضف المعلمين وتخصصاتهم وحدود الأحمال."
          cta="فتح"
          href={`${base}/teachers`}
        />

        <ActionCard
          title="إدارة الإسناد"
          description="اربط المواد والفصول بالمعلمين مع عدد الحصص."
          cta="فتح"
          href={`${base}/assignments`}
        />

        <ActionCard
          title="القيود والأوقات"
          description="أوقات اليوم والأيام وقيود المعلمين والفصول."
          cta="فتح"
          href={`${base}/constraints`}
        />

        <ActionCard
          title="فحص الجاهزية"
          description="مراجعة الإسناد والأحمال قبل الإنشاء."
          cta="فتح"
          href={`${base}/readiness`}
        />

        <ActionCard
          title="إنشاء الجدول"
          description="شغّل المحرك وابحث عن النسخة المثلى."
          cta="فتح"
          href={`${base}/generate`}
        />

        <ActionCard
          title="مراجعة النسخ والاعتماد"
          description="قارن النسخ واعتمد أو انشر الجدول."
          cta="فتح"
          href={`${base}/generate`}
        />
      </div>
    </section>
  );
}
