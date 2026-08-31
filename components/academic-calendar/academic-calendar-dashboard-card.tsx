import { CalendarDays } from "lucide-react";
import { SEMESTER_ONE_ACADEMIC_YEAR } from "@/lib/academic-calendar/academic-calendar-data";
import {
  formatAcademicWeekLabel,
  formatGregorianCalendarRange,
  formatHijriCalendarRange,
  getCurrentAcademicCalendarStatus,
} from "@/lib/academic-calendar/academic-calendar-service";

export function AcademicCalendarDashboardCard({ compact = false }: { compact?: boolean }) {
  const status = getCurrentAcademicCalendarStatus();
  const event = status.event;

  if (compact) {
    return (
      <section className="rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm dark:border-sky-900/50 dark:bg-slate-950">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-200">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-black">{SEMESTER_ONE_ACADEMIC_YEAR} · الفصل الدراسي الأول</span>
          </div>
          {status.currentWeek ? (
            <span className="font-black text-slate-600 dark:text-slate-300">
              {formatAcademicWeekLabel(status.currentWeek)}
            </span>
          ) : null}
          <span className="min-w-0 font-bold text-slate-500 dark:text-slate-400">
            {event ? `${event.title} · ${status.remainingLabel || formatGregorianCalendarRange(event)}` : status.timingLabel}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-5 text-white shadow-lg sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-sky-100">
            {SEMESTER_ONE_ACADEMIC_YEAR} · الفصل الدراسي الأول
          </p>
          <h2 className="mt-1 text-2xl font-black leading-9">
            التقويم الدراسي
          </h2>
        </div>

        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/15 sm:h-12 sm:w-12">
          <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>

      {status.currentWeek ? (
        <span className="mt-4 inline-flex max-w-full rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white ring-1 ring-white/10">
          {formatAcademicWeekLabel(status.currentWeek)}
        </span>
      ) : null}

      {event ? (
        <div className="mt-5 min-w-0 rounded-2xl bg-white/15 p-4 ring-1 ring-white/10">
          <h3 className="break-words text-lg font-black leading-8 text-white">
            {event.title}
          </h3>

          <div className="mt-3 space-y-1.5 text-sm font-bold leading-6 text-sky-50">
            <p>{formatGregorianCalendarRange(event)}</p>
            <p>{formatHijriCalendarRange(event)}</p>
          </div>

          <div className="mt-4 border-t border-white/15 pt-3">
            <p className="text-base font-black text-white">
              {status.timingLabel}
            </p>
            {status.remainingLabel ? (
              <p className="mt-1 text-xs font-bold text-sky-100">
                {status.remainingLabel}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-white/15 p-4 ring-1 ring-white/10">
          <p className="text-lg font-black leading-8 text-white">
            {status.timingLabel}
          </p>
          <p className="mt-2 text-sm font-bold leading-7 text-sky-50">
            {status.remainingLabel}
          </p>
        </div>
      )}
    </section>
  );
}
