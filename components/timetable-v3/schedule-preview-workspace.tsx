"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { filterTimetableV3ScheduleEntries } from "@/lib/timetable-v3/schedule-view";
import { timetableV3StatusLabel } from "@/lib/timetable-v3/display-labels";

type Entry = {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectName: string;
  dayId: string;
  dayLabel: string;
  periodId: string;
  periodLabel: string;
  periodOrder: number;
};

type Workspace = {
  project: {
    id: string;
    name: string;
  };
  schedule: null | {
    id: string;
    version: number;
    status: string;
    generatedAt: string;
    sessions: number;
  };
  days?: Array<{ id: string; label: string; order: number }>;
  periods?: Array<{ id: string; label: string; order: number }>;
  classes?: Array<{ id: string; name: string }>;
  teachers?: Array<{ id: string; name: string; specialty: string | null }>;
  entries?: Entry[];
  scopes?: {
    stage: { available: boolean; reason: string; options: Array<{ id: string; label: string }> };
    grade: { available: boolean; reason: string; options: Array<{ id: string; label: string }> };
  };
};

type PreviewMode = "full" | "stage" | "grade" | "teacher";

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function TimetableV3SchedulePreviewWorkspace({
  workspace,
}: {
  workspace: Workspace;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<PreviewMode>("full");
  const [teacherId, setTeacherId] = useState(workspace.teachers?.[0]?.id ?? "");

  const teacher = useMemo(
    () => workspace.teachers?.find((item) => item.id === teacherId) ?? null,
    [teacherId, workspace.teachers],
  );

  if (!workspace.schedule) {
    return (
      <main dir="rtl" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-8">
          <p className="text-xs font-black text-[#3478B8]">خدمات مدير المدرسة</p>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">معاينة الجدول</h1>
        </header>
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center">
          <h2 className="text-lg font-bold text-slate-950">لا يوجد جدول محفوظ للمعاينة</h2>
          <button type="button" onClick={() => router.push(`/dashboard/timetable-v3/${workspace.project.id}/timefold`)} className="mt-5 h-11 rounded-xl bg-[#3478B8] px-5 text-sm font-bold text-white transition hover:bg-[#2D6BA5]">
            العودة إلى إنشاء الجدول
          </button>
        </section>
      </main>
    );
  }

  const schedule = workspace.schedule;
  const days = workspace.days ?? [];
  const periods = workspace.periods ?? [];
  const classes = workspace.classes ?? [];
  const entries = workspace.entries ?? [];
  const visibleEntries = mode === "teacher" && teacher
    ? filterTimetableV3ScheduleEntries(entries, { mode: "teacher", teacherId: teacher.id })
    : entries;
  const scheduleQuery = new URLSearchParams({ scheduleId: schedule.id }).toString();

  return (
    <main dir="rtl" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-[#3478B8]">خدمات مدير المدرسة</p>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">معاينة الجدول</h1>
          <p className="mt-2 text-sm text-slate-500">النسخة {schedule.version} · {dateFormatter.format(new Date(schedule.generatedAt))} · {timetableV3StatusLabel(schedule.status)} · {schedule.sessions} حصة</p>
        </div>
        <button type="button" onClick={() => router.push(`/dashboard/timetable-v3/${workspace.project.id}/validator?${scheduleQuery}`)} className="h-11 rounded-xl bg-[#3478B8] px-5 text-sm font-bold text-white transition hover:bg-[#2D6BA5]">
          متابعة إلى التحقق
        </button>
      </header>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ["full", "الجدول كامل"],
            ["stage", "حسب المرحلة"],
            ["grade", "حسب الصف"],
            ["teacher", "حسب المعلم"],
          ] as const).map(([value, label]) => {
            const disabled = value === "stage"
              ? !workspace.scopes?.stage.available
              : value === "grade"
                ? !workspace.scopes?.grade.available
                : false;
            return (
              <button key={value} type="button" disabled={disabled} onClick={() => setMode(value)} className={`h-11 rounded-xl border text-sm font-bold transition ${mode === value ? "border-[#3478B8] bg-[#EEF7FC] text-[#3478B8]" : "border-slate-200 text-slate-600"} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300`}>
                {label}
              </button>
            );
          })}
        </div>

        {!workspace.scopes?.stage.available || !workspace.scopes?.grade.available ? (
          <div className="mt-3 space-y-1 text-xs leading-5 text-amber-700">
            {!workspace.scopes?.stage.available ? <p>حسب المرحلة: {workspace.scopes?.stage.reason}</p> : null}
            {!workspace.scopes?.grade.available ? <p>حسب الصف: {workspace.scopes?.grade.reason}</p> : null}
          </div>
        ) : null}

        {mode === "teacher" ? (
          <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="mt-4 h-11 w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3478B8]">
            {(workspace.teachers ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}{item.specialty ? ` — ${item.specialty}` : ""}</option>)}
          </select>
        ) : null}
      </section>

      <div className="mt-5">
        {mode === "full" ? (
          <FullSchedule days={days} periods={periods} classes={classes} entries={entries} />
        ) : mode === "teacher" && teacher ? (
          <TeacherSchedule teacherName={teacher.name} days={days} periods={periods} entries={visibleEntries} />
        ) : null}
      </div>
    </main>
  );
}

function FullSchedule({ days, periods, classes, entries }: {
  days: Array<{ id: string; label: string }>;
  periods: Array<{ id: string; label: string }>;
  classes: Array<{ id: string; name: string }>;
  entries: Entry[];
}) {
  return (
    <div className="space-y-5">
      {days.map((day) => (
        <section key={day.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-5 py-4 font-bold text-slate-950">{day.label}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead><tr className="bg-slate-50"><th className="w-32 border-b border-l border-slate-200 p-3 text-right">الفصل</th>{periods.map((period) => <th key={period.id} className="border-b border-l border-slate-200 p-3 text-center">{period.label}</th>)}</tr></thead>
              <tbody>{classes.map((classItem) => <tr key={classItem.id}><th className="border-b border-l border-slate-100 p-3 text-right font-bold text-slate-800">{classItem.name}</th>{periods.map((period) => {
                const entry = entries.find((item) => item.classId === classItem.id && item.dayId === day.id && item.periodId === period.id);
                return <td key={period.id} className="h-16 border-b border-l border-slate-100 p-2 text-center">{entry ? <><div className="font-bold text-slate-900">{entry.subjectName}</div><div className="mt-1 text-xs text-slate-500">{entry.teacherName}</div></> : <span className="text-slate-300">—</span>}</td>;
              })}</tr>)}</tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function TeacherSchedule({ teacherName, days, periods, entries }: {
  teacherName: string;
  days: Array<{ id: string; label: string }>;
  periods: Array<{ id: string; label: string }>;
  entries: Entry[];
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <h2 className="border-b border-slate-100 px-5 py-4 font-bold text-slate-950">جدول المعلم: {teacherName}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-sm">
          <thead><tr className="bg-slate-50"><th className="w-28 border-b border-l border-slate-200 p-3 text-right">اليوم</th>{periods.map((period) => <th key={period.id} className="border-b border-l border-slate-200 p-3 text-center">{period.label}</th>)}</tr></thead>
          <tbody>{days.map((day) => <tr key={day.id}><th className="border-b border-l border-slate-100 p-3 text-right font-bold text-slate-800">{day.label}</th>{periods.map((period) => {
            const entry = entries.find((item) => item.dayId === day.id && item.periodId === period.id);
            return <td key={period.id} className="h-16 border-b border-l border-slate-100 p-2 text-center">{entry ? <><div className="font-bold text-slate-900">{entry.subjectName}</div><div className="mt-1 text-xs text-slate-500">{entry.className}</div></> : <span className="text-slate-300">—</span>}</td>;
          })}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
