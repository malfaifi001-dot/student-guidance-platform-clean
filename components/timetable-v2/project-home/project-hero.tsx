import type {
  ProjectDashboardData,
} from "@/lib/timetable-v2/project-dashboard-types";

import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
} from "./labels";

function HeroMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="text-[11px] font-bold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}

export function ProjectHero({
  data,
}: {
  data: ProjectDashboardData;
}) {
  const status =
    data.project.status;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
            مركز إدارة جدول الحصص
          </div>

          <h1 className="mt-3 truncate text-3xl font-black text-slate-950">
            {data.project.name}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {data.project.academicYear}
            {" • "}
            {data.project.semester}
          </p>

          {data.setup.stageLabels.length >
          0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.setup.stageLabels.map(
                (label) => (
                  <span
                    key={label}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600"
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
          ) : null}
        </div>

        <span
          className={[
            "inline-flex shrink-0 items-center self-start rounded-full border px-4 py-2 text-xs font-black",
            PROJECT_STATUS_TONES[status] ??
              PROJECT_STATUS_TONES.DRAFT,
          ].join(" ")}
        >
          {PROJECT_STATUS_LABELS[status] ??
            status}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <HeroMetric
          label="أيام الدراسة"
          value={data.time.daysCount}
        />

        <HeroMetric
          label="الحصص اليومية"
          value={data.time.periodsPerDay}
        />

        <HeroMetric
          label="الخانات الأسبوعية"
          value={data.time.weeklySlotCount}
        />
      </div>
    </section>
  );
}
