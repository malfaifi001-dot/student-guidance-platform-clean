"use client";

import { useState } from "react";
import { CalendarDays, Clock3, FolderOpen, Plus } from "lucide-react";

import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import { TimetableDataCard } from "@/components/timetable/timetable-data-card";

type ProjectItem = {
  id: string;
  name: string;
  academicYear: string;
  semester: string;
  status?: string;
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
    <main className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-sky-600 p-8 text-white shadow-xl">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black text-sky-100">الخدمات المدرسية</p>
            <h1 className="mt-2 text-4xl font-black text-white">
              إعداد الجدول الدراسي
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-8 text-sky-50">
              أنشئ مشروع الجدول وحدد أيام الدراسة وأوقات الحصص.
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white">
            <CalendarDays className="h-7 w-7" />
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-sky-700">مشروع جديد</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">بيانات الجدول</h2>
          </div>
        </div>

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
                className="rounded-full bg-sky-50 px-3 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100"
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

        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {busy ? "جارٍ الحفظ..." : "إنشاء الجدول"}
        </button>
      </section>

      {projects.length ? (
        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">
            الجداول السابقة
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <TimetableDataCard
                key={project.id}
                icon={<FolderOpen className="h-5 w-5" />}
                eyebrow="مشروع جدول"
                title={project.name}
                tone={projectTone(project.status)}
                badges={[projectStatusLabel(project.status)]}
                metrics={[
                  { label: "العام الدراسي", value: project.academicYear },
                  { label: "الفصل الدراسي", value: project.semester },
                ]}
                actions={
                  <a
                    href={`/dashboard/principal/timetable/${project.id}`}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                  >
                    فتح المشروع
                  </a>
                }
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-100">
            <CalendarDays className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-black text-slate-800">
            لا توجد جداول سابقة
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-500">
            سيظهر مشروع الجدول هنا بعد إنشائه.
          </p>
        </section>
      )}
      <SmartFeedbackModal
        open={Boolean(message)}
        type={message.startsWith("تم") ? "success" : "error"}
        title={message.startsWith("تم") ? "تم الحفظ" : "تعذر إكمال العملية"}
        description={message}
        primaryActionLabel="حسنًا"
        onOpenChange={(open) => {
          if (!open) setMessage("");
        }}
      />
    </main>
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

function projectStatusLabel(status?: string) {
  if (status === "PUBLISHED") return "منشور";
  if (status === "APPROVED") return "معتمد";
  if (status === "GENERATED") return "تم التوليد";
  if (status === "ARCHIVED") return "مؤرشف";
  return "مسودة";
}

function projectTone(status?: string) {
  if (status === "PUBLISHED") return "emerald" as const;
  if (status === "APPROVED") return "sky" as const;
  if (status === "GENERATED") return "violet" as const;
  return "slate" as const;
}
