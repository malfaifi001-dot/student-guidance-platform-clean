"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardList, Layers3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";

type WeeklyEntry = { id: string; stage?: string; weekNumber?: number; updatedAt?: string | null };
type SemesterRow = { id: string; stage?: string; grades?: string[]; programs?: unknown[]; periodCount?: string | null; updatedAt?: string | null };

export function ActivityPlanOverview() {
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyEntry[]>([]);
  const [semesterRows, setSemesterRows] = useState<SemesterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const initialResponse = await fetch("/api/dashboard/activity-plan?week=1", { cache: "no-store" });
        const initial = await initialResponse.json().catch(() => ({}));
        if (!initialResponse.ok || cancelled) return;
        const rawStages: unknown[] = Array.isArray(initial.stages) ? initial.stages : [];
        const stages = rawStages.filter((stage): stage is string => typeof stage === "string");
        const weeklyRequests = stages.flatMap((stage) => Array.from({ length: 20 }, (_, index) =>
          fetch(`/api/dashboard/activity-plan?week=${index + 1}&stage=${encodeURIComponent(stage)}`, { cache: "no-store" })
            .then((response) => response.json().catch(() => ({}))),
        ));
        const semesterRequests = stages.map((stage) =>
          fetch(`/api/dashboard/activity-plan/ten-percent?stage=${encodeURIComponent(stage)}`, { cache: "no-store" })
            .then((response) => response.json().catch(() => ({}))),
        );
        const [weeklyPayloads, semesterPayloads] = await Promise.all([
          Promise.all(weeklyRequests),
          Promise.all(semesterRequests),
        ]);
        if (cancelled) return;
        setWeeklyEntries(weeklyPayloads.flatMap((payload) => Array.isArray(payload.entries)
          ? (payload.entries as WeeklyEntry[]).map((entry) => ({ ...entry, weekNumber: Number(payload.week) || 1 }))
          : []));
        setSemesterRows(semesterPayloads.flatMap((payload) => Array.isArray(payload.rows) ? payload.rows as SemesterRow[] : []));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const weeklyCards = useMemo(() => {
    const groups = new Map<string, WeeklyEntry[]>();
    for (const entry of weeklyEntries) {
      const stage = entry.stage || "—";
      const week = entry.weekNumber || 1;
      const key = `${stage}::${week}`;
      groups.set(key, [...(groups.get(key) || []), entry]);
    }
    return Array.from(groups.entries()).map(([key, entries]) => {
      const [stage, week] = key.split("::");
      return { key, stage, week, count: entries.length };
    }).sort((a, b) => a.stage.localeCompare(b.stage, "ar") || Number(a.week) - Number(b.week));
  }, [weeklyEntries]);

  const semesterCards = useMemo(() => {
    const groups = new Map<string, SemesterRow[]>();
    for (const row of semesterRows) {
      const destinations = row.grades?.length ? row.grades : [""];
      for (const destination of destinations) {
        const key = `${row.stage || "—"}::${destination}`;
        groups.set(key, [...(groups.get(key) || []), row]);
      }
    }
    return Array.from(groups.entries()).map(([key, rows]) => {
      const divider = key.indexOf("::");
      const stage = key.slice(0, divider);
      const destination = key.slice(divider + 2);
      return {
        key,
        stage,
        destination,
        programs: rows.reduce((total, row) => total + (Array.isArray(row.programs) ? row.programs.length : 0), 0),
        sessions: rows.reduce((total, row) => total + Number(row.periodCount || 0), 0),
      };
    }).sort((a, b) => a.stage.localeCompare(b.stage, "ar") || a.destination.localeCompare(b.destination, "ar"));
  }, [semesterRows]);

  const stageGroups = useMemo(() => {
    const groups = new Map<string, { stage: string; weekly?: { weeks: number; activities: number; latestWeek: number }; semester?: { destinations: number; programs: number; sessions: number } }>();
    for (const card of weeklyCards) {
      const group = groups.get(card.stage) || { stage: card.stage };
      group.weekly = group.weekly
        ? { weeks: group.weekly.weeks + 1, activities: group.weekly.activities + card.count, latestWeek: Math.max(group.weekly.latestWeek, Number(card.week)) }
        : { weeks: 1, activities: card.count, latestWeek: Number(card.week) };
      groups.set(card.stage, group);
    }
    for (const card of semesterCards) {
      const group = groups.get(card.stage) || { stage: card.stage };
      group.semester = group.semester
        ? { destinations: group.semester.destinations + 1, programs: group.semester.programs + card.programs, sessions: group.semester.sessions + card.sessions }
        : { destinations: 1, programs: card.programs, sessions: card.sessions };
      groups.set(card.stage, group);
    }
    return Array.from(groups.values()).sort((a, b) => a.stage.localeCompare(b.stage, "ar"));
  }, [semesterCards, weeklyCards]);

  const empty = !loading && !stageGroups.length;

  return <main className="w-full min-w-0 max-w-full space-y-5 overflow-x-clip" dir="rtl">
    <section className="rounded-[1.75rem] border border-sky-700 bg-gradient-to-l from-[#0F5F7A] via-[#0F7FA8] to-[#168A7A] px-5 py-5 text-white shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight">خطة النشاط الطلابي</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href="/dashboard/activity-leader/activity-plan/weekly" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-[#0F5F7A] shadow-sm transition hover:bg-sky-50"><CalendarDays className="h-4 w-4" />الخطة الأسبوعية</Link>
          <Link href="/dashboard/activity-leader/activity-plan/semester" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/20"><Layers3 className="h-4 w-4" />الخطة الفصلية</Link>
        </div>
      </div>
    </section>

    {loading ? <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">جارٍ تحميل الخطط المحفوظة...</section> : null}
    {empty ? <section className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 px-5 py-12 text-center dark:border-sky-900/60 dark:bg-sky-950/15"><ClipboardList className="mx-auto h-9 w-9 text-sky-600 dark:text-sky-300" /><h2 className="mt-3 text-base font-black text-slate-900 dark:text-slate-100">لا توجد خطة محفوظة بعد</h2><p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">ابدأ بالخطة المناسبة لنشاطك.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Link href="/dashboard/activity-leader/activity-plan/weekly" className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white">إنشاء خطة أسبوعية</Link><Link href="/dashboard/activity-leader/activity-plan/semester" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">إنشاء خطة فصلية</Link></div></section> : null}

    {!loading && !empty ? <section className="space-y-4">{stageGroups.map((group) => <section key={group.stage} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"><h2 className="text-base font-black text-slate-950 dark:text-white">{group.stage}</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{group.weekly ? <article className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-md dark:border-sky-900/70 dark:bg-sky-950/20 dark:hover:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-black text-slate-950 dark:text-white">الخطة الأسبوعية</h3><p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">آخر أسبوع مستخدم: {group.weekly.latestWeek}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm ring-1 ring-sky-100 dark:bg-slate-900 dark:ring-slate-800"><CalendarDays className="h-5 w-5" /></span></div><div className="mt-3 grid grid-cols-2 gap-2"><DashboardStatCard stat={{ label: "أسابيع تحتوي بيانات", value: String(group.weekly.weeks) }} /><DashboardStatCard stat={{ label: "أنشطة محفوظة", value: String(group.weekly.activities) }} /></div><Link href={`/dashboard/activity-leader/activity-plan/weekly?stage=${encodeURIComponent(group.stage)}&week=${group.weekly.latestWeek}`} className="mt-4 inline-flex min-h-10 items-center gap-1 rounded-xl bg-sky-700 px-3 text-xs font-black text-white shadow-sm transition hover:bg-sky-800 hover:shadow-md">فتح <ArrowLeft className="h-3.5 w-3.5" /></Link></article> : null}{group.semester ? <article className="rounded-xl border border-teal-100 bg-teal-50/60 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-md dark:border-teal-900/70 dark:bg-teal-950/20 dark:hover:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-black text-slate-950 dark:text-white">الخطة الفصلية</h3><p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">برامج موزعة على الصفوف والفصول</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm ring-1 ring-teal-100 dark:bg-slate-900 dark:ring-slate-800"><Layers3 className="h-5 w-5" /></span></div><div className="mt-3 grid grid-cols-3 gap-2"><DashboardStatCard stat={{ label: "فصول مستخدمة", value: String(group.semester.destinations) }} /><DashboardStatCard stat={{ label: "برامج", value: String(group.semester.programs) }} /><DashboardStatCard stat={{ label: "حصص", value: String(group.semester.sessions) }} /></div><Link href={`/dashboard/activity-leader/activity-plan/semester?stage=${encodeURIComponent(group.stage)}`} className="mt-4 inline-flex min-h-10 items-center gap-1 rounded-xl border border-teal-200 bg-white px-3 text-xs font-black text-teal-800 shadow-sm transition hover:bg-teal-100 hover:shadow-md dark:border-teal-900/60 dark:bg-teal-950/25 dark:text-teal-200">فتح <ArrowLeft className="h-3.5 w-3.5" /></Link></article> : null}</div></section>)}</section> : null}
  </main>;
}
