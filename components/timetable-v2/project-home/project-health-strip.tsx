import type {
  ProjectDashboardData,
} from "@/lib/timetable-v2/project-dashboard-types";

function HealthTile({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-3">
      <div className="text-[11px] font-bold text-slate-500">
        {label}
      </div>

      <div
        className={[
          "mt-1 text-lg font-black",
          valueClass ??
            "text-slate-900",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

export function ProjectHealthStrip({
  data,
}: {
  data: ProjectDashboardData;
}) {
  const readiness =
    data.readiness;

  const scoreTone =
    readiness.score >= 90
      ? "text-teal-700"
      : readiness.score >= 70
        ? "text-amber-700"
        : "text-rose-700";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black text-slate-900">
          حالة المشروع
        </h2>

        {readiness.errorCount > 0 ? (
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
            {readiness.errorCount} خطأ يمنع الإنشاء
          </span>
        ) : readiness.warningCount > 0 ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
            {readiness.warningCount} تحذير
          </span>
        ) : (
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
            البيانات سليمة
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <HealthTile
          label="جاهزية المشروع"
          value={`${readiness.score}%`}
          valueClass={scoreTone}
        />

        <HealthTile
          label="المعلمون"
          value={data.counts.teachersCount}
        />

        <HealthTile
          label="الفصول"
          value={data.counts.classesCount}
        />

        <HealthTile
          label="المواد"
          value={data.counts.subjectsCount}
        />

        <HealthTile
          label="الحصص المطلوبة"
          value={data.counts.totalWeeklyLessons}
        />

        <HealthTile
          label="المسند"
          value={data.counts.assignedLessons}
        />

        <HealthTile
          label="القيود النشطة"
          value={data.constraints.activeCount}
        />

        <HealthTile
          label="التعارضات"
          value={data.constraints.conflictCount}
        />
      </div>
    </section>
  );
}
