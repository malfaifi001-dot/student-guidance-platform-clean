"use client";

import { useState } from "react";

type ProjectItem = {
  id: string;
  name: string;
  academicYear: string;
  semester: string;
};

const days = [
  { id: "sunday", label: "الأحد", order: 0 },
  { id: "monday", label: "الاثنين", order: 1 },
  { id: "tuesday", label: "الثلاثاء", order: 2 },
  { id: "wednesday", label: "الأربعاء", order: 3 },
  { id: "thursday", label: "الخميس", order: 4 },
] as const;

export function TimetableSetup({
  initialProjects,
}: {
  initialProjects: ProjectItem[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [name, setName] = useState("الجدول المدرسي");
  const [academicYear, setAcademicYear] = useState("1448");
  const [semester, setSemester] = useState("الفصل الأول");
  const [periodCount, setPeriodCount] = useState(7);
  const [startTime, setStartTime] = useState("07:00");
  const [lessonDuration, setLessonDuration] = useState(45);
  const [breakAfter, setBreakAfter] = useState(3);
  const [breakDuration, setBreakDuration] = useState(20);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true);
    setMessage("");

    const periods = createPeriods({
      periodCount,
      startTime,
      lessonDuration,
      breakAfter,
      breakDuration,
    });

    const response = await fetch(
      "/api/dashboard/principal/timetable/projects",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          academicYear,
          semester,
          days,
          periods,
          settings: {
            startTime,
            lessonDurationMinutes: lessonDuration,
            breakAfterPeriod: breakAfter,
            breakDurationMinutes: breakDuration,
          },
        }),
      },
    );

    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(result.error || "تعذر حفظ الجدول.");
      return;
    }

    setProjects((current) => [result.project, ...current]);
    setMessage("تم إنشاء الجدول.");
  }

  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-black text-slate-950">
          إعداد الجدول الدراسي
        </h1>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Field label="اسم الجدول" value={name} onChange={setName} />
          <Field
            label="العام الدراسي"
            value={academicYear}
            onChange={setAcademicYear}
          />
          <Field
            label="الفصل الدراسي"
            value={semester}
            onChange={setSemester}
          />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-black text-slate-700">
            أيام الدراسة
          </p>

          <div className="flex flex-wrap gap-2">
            {days.map((day) => (
              <span
                key={day.id}
                className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700"
              >
                {day.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <NumberField
            label="عدد الحصص"
            value={periodCount}
            onChange={setPeriodCount}
          />
          <Field
            label="بداية الدوام"
            value={startTime}
            onChange={setStartTime}
            type="time"
          />
          <NumberField
            label="مدة الحصة"
            value={lessonDuration}
            onChange={setLessonDuration}
          />
          <NumberField
            label="الفسحة بعد"
            value={breakAfter}
            onChange={setBreakAfter}
          />
          <NumberField
            label="مدة الفسحة"
            value={breakDuration}
            onChange={setBreakDuration}
          />
        </div>

        {message ? (
          <p className="mt-4 text-sm font-bold text-sky-700">
            {message}
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="mt-5 rounded-xl bg-sky-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          {busy ? "جارٍ الحفظ..." : "إنشاء الجدول"}
        </button>
      </section>

      {projects.length ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="font-black text-slate-950">
            الجداول السابقة
          </h2>

          <div className="mt-4 space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
              >
                <div>
  <strong>{project.name}</strong>
  <a
    href={`/dashboard/principal/timetable/${project.id}`}
    className="mr-3 text-sm font-black text-sky-700"
  >
    فتح
  </a>
</div>

                <span className="text-sm text-slate-500">
                  {project.academicYear} — {project.semester}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      <span>{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field
      label={label}
      type="number"
      value={String(value)}
      onChange={(next) => onChange(Number(next))}
    />
  );
}

function createPeriods(input: {
  periodCount: number;
  startTime: string;
  lessonDuration: number;
  breakAfter: number;
  breakDuration: number;
}) {
  const result = [];
  let cursor = toMinutes(input.startTime);
  let order = 0;

  for (let number = 1; number <= input.periodCount; number += 1) {
    const start = toTime(cursor);
    cursor += input.lessonDuration;

    result.push({
      id: `period-${number}`,
      label: `الحصة ${number}`,
      order,
      startTime: start,
      endTime: toTime(cursor),
      isBreak: false,
    });

    order += 1;

    if (
      input.breakAfter === number &&
      input.breakDuration > 0
    ) {
      const startBreak = toTime(cursor);
      cursor += input.breakDuration;

      result.push({
        id: "break-1",
        label: "الفسحة",
        order,
        startTime: startBreak,
        endTime: toTime(cursor),
        isBreak: true,
      });

      order += 1;
    }
  }

  return result;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}