import type {
  ProjectDashboardData,
} from "@/lib/timetable-v2/project-dashboard-types";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold text-slate-400">
        {label}
      </div>

      <div className="mt-0.5 text-base font-black text-slate-900">
        {value}

        {hint ? (
          <span className="mr-1 text-[10px] font-bold text-slate-400">
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectDataSummary({
  data,
}: {
  data: ProjectDashboardData;
}) {
  const counts = data.counts;
  const constraints = data.constraints;

  const stageCount =
    data.setup.stageLabels.length;

  const teacherMetric =
    data.setup.teacherTarget !==
    null
      ? `${counts.teachersCount}/${data.setup.teacherTarget}`
      : counts.teachersCount;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-950">
          بيانات المشروع
        </h2>

        <span className="text-[11px] font-bold text-slate-400">
          ملخص مفصل عن الهيكل والموارد والزمن والقواعد
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="text-xs font-black text-teal-700">
            الهيكل الدراسي
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat
              label="المراحل"
              value={stageCount}
              hint={
                stageCount > 0
                  ? data.setup.stageLabels.join(
                      "، ",
                    )
                  : undefined
              }
            />

            <Stat
              label="الفصول"
              value={counts.classesCount}
            />

            <Stat
              label="المواد"
              value={counts.subjectsCount}
            />

            <Stat
              label="الخطط"
              value={counts.classSubjectsCount}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="text-xs font-black text-teal-700">
            الموارد
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat
              label="المعلمون"
              value={teacherMetric}
            />

            <Stat
              label="مجموع طاقة المعلمين"
              value={counts.teacherCapacity}
              hint="حصة أسبوعيًا"
            />

            <Stat
              label="الحصص المسندة"
              value={counts.assignedLessons}
            />

            <Stat
              label="الحصص المطلوبة"
              value={counts.totalWeeklyLessons}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="text-xs font-black text-teal-700">
            الزمن
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat
              label="أيام الدراسة"
              value={data.time.daysCount}
            />

            <Stat
              label="الحصص اليومية"
              value={data.time.periodsPerDay}
            />

            <Stat
              label="الخانات الأسبوعية"
              value={data.time.weeklySlotCount}
            />

            <Stat
              label="الفسحات"
              value={data.time.breaksCount}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="text-xs font-black text-teal-700">
            القواعد
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat
              label="القيود النشطة"
              value={constraints.activeCount}
            />

            <Stat
              label="إلزامية"
              value={constraints.hardCount}
            />

            <Stat
              label="تفضيلات"
              value={constraints.softCount}
            />

            <Stat
              label="التعارضات"
              value={constraints.conflictCount}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
