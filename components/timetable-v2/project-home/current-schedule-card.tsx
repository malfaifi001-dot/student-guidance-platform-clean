import Link from "next/link";

import type {
  ProjectDashboardData,
} from "@/lib/timetable-v2/project-dashboard-types";

import {
  SCHEDULE_STATUS_LABELS,
  formatScheduleDate,
} from "./labels";

export function CurrentScheduleCard({
  data,
}: {
  data: ProjectDashboardData;
}) {
  const schedule = data.schedule;

  const base = `/dashboard/timetable-v2/${data.project.id}`;

  if (!schedule.exists || !schedule.current) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">
          الجدول الحالي
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          لم يتم إنشاء جدول حتى الآن. أكمل فحص الجاهزية ثم شغّل
          المحرك.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`${base}/readiness`}
            className="h-10 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-800"
          >
            فتح فحص الجاهزية
          </Link>

          <Link
            href={`${base}/generate`}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            فتح إنشاء الجدول
          </Link>
        </div>
      </section>
    );
  }

  const current = schedule.current;

  const statusLabel =
    SCHEDULE_STATUS_LABELS[
      current.status
    ] ?? current.status;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-slate-950">
            الجدول الحالي
          </h2>

          <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-black text-white">
            نسخة #{current.version}
          </span>

          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-black text-teal-700">
            {statusLabel}
          </span>

          {current.status ===
          "APPROVED" ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
              معتمد
            </span>
          ) : null}

          {current.status ===
          "PUBLISHED" ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
              منشور
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="text-[11px] font-bold text-slate-500">
            الجودة
          </div>

          <div className="mt-1 text-xl font-black text-teal-700">
            {current.score}%
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="text-[11px] font-bold text-slate-500">
            الاكتمال
          </div>

          <div className="mt-1 text-xl font-black text-slate-900">
            {current.completeness}%
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="text-[11px] font-bold text-slate-500">
            عدد الحصص
          </div>

          <div className="mt-1 text-xl font-black text-slate-900">
            {current.entriesCount}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="text-[11px] font-bold text-slate-500">
            تاريخ الإنشاء
          </div>

          <div className="mt-1 text-sm font-black leading-6 text-slate-900">
            {formatScheduleDate(
              current.generatedAt,
            )}
          </div>
        </div>
      </div>

      {schedule.isStale ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs font-black text-amber-900">
            هذه النسخة أقدم من بيانات المشروع الحالية
          </div>

          <p className="mt-1 text-[11px] leading-5 text-amber-700">
            تم تعديل الإسنادات أو القيود أو الأوقات بعد إنشاء هذه
            النسخة. يفضل إنشاء نسخة جديدة للاعتماد.
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`${base}/generate`}
          className="h-10 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
        >
          فتح إنشاء الجدول
        </Link>

        <Link
          href={`${base}/generate`}
          className="h-10 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
        >
          إنشاء نسخة جديدة
        </Link>
      </div>
    </section>
  );
}
