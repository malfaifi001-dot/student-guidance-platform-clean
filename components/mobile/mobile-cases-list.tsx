"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { MobileAppShell } from "@/components/mobile/mobile-app-shell";
import { MobileIcon } from "@/components/mobile/mobile-icons";

type MobileCaseRow = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  updatedAtLabel: string;
  createdAtLabel: string;
  service: {
    name: string;
    slug: string;
  };
  workflow?: {
    name: string;
    workflowType?: string | null;
  } | null;
  student?: {
    fullName: string;
    nationalId?: string | null;
    meta: string;
  } | null;
  createdBy?: {
    name: string;
  } | null;
  valuesCount: number;
  evidencesCount: number;
  reportsCount: number;
  isMine: boolean;
};

type CaseFilter = "all" | "drafts" | "submitted" | "reports" | "evidence";

function normalizeArabicText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function getStatusClasses(status: string) {
  if (status === "DRAFT") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  }

  if (status === "SUBMITTED") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function getCaseAction(caseItem: MobileCaseRow) {
  return {
    label: "فتح",
    href: `/mobile/counselor/cases/${encodeURIComponent(caseItem.id)}`,
  };
}

function EmptyState() {
  return (
    <section className="rounded-[1.6rem] bg-white/80 p-5 text-center shadow-sm ring-1 ring-white/90 backdrop-blur-xl">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <MobileIcon name="check" className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-black text-slate-950">لا توجد حالات</h2>
      <p className="mt-2 text-xs leading-6 text-slate-500">
        ابدأ بإنشاء حالة جديدة، وستظهر هنا مباشرة.
      </p>
      <Link
        href="/mobile/counselor/cases/new"
        className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-sky-50 px-5 text-sm font-black text-sky-700 ring-1 ring-sky-100"
      >
        حالة جديدة
      </Link>
    </section>
  );
}

function CaseCard({ caseItem }: { caseItem: MobileCaseRow }) {
  const action = getCaseAction(caseItem);

  return (
    <article className="rounded-[1.55rem] bg-white/82 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-500 ring-1 ring-white/80">
          <MobileIcon name="check" className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-black leading-6 text-slate-950">
              {caseItem.title}
            </h3>

            <span
              className={[
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black",
                getStatusClasses(caseItem.status),
              ].join(" ")}
            >
              {caseItem.statusLabel}
            </span>
          </div>

          <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
            {caseItem.student?.fullName || caseItem.service.name}
          </p>

          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {caseItem.student?.meta || caseItem.service.name}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-slate-50 p-2 text-center">
          <p className="text-sm font-black text-slate-900">{caseItem.valuesCount}</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">حقول</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-2 text-center">
          <p className="text-sm font-black text-slate-900">{caseItem.evidencesCount}</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">شواهد</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-2 text-center">
          <p className="text-sm font-black text-slate-900">{caseItem.reportsCount}</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">تقارير</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-[11px] font-bold text-slate-400">
          آخر تحديث: {caseItem.updatedAtLabel}
        </span>

        <Link
          href={action.href}
          className="flex h-9 min-w-20 items-center justify-center rounded-2xl bg-sky-50 px-4 text-xs font-black text-sky-700 ring-1 ring-sky-100"
        >
          {action.label}
        </Link>
      </div>
    </article>
  );
}

export function MobileCasesList({ cases }: { cases: MobileCaseRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CaseFilter>("all");

  const stats = useMemo(() => {
    return {
      total: cases.length,
      drafts: cases.filter((item) => item.status === "DRAFT").length,
      submitted: cases.filter((item) => item.status === "SUBMITTED").length,
      reports: cases.filter((item) => item.reportsCount > 0).length,
    };
  }, [cases]);

  const filteredCases = useMemo(() => {
    const cleanQuery = normalizeArabicText(query);

    return cases.filter((item) => {
      if (filter === "drafts" && item.status !== "DRAFT") return false;
      if (filter === "submitted" && item.status !== "SUBMITTED") return false;
      if (filter === "reports" && item.reportsCount <= 0) return false;
      if (filter === "evidence" && item.evidencesCount <= 0) return false;

      if (!cleanQuery) return true;

      const searchableText = normalizeArabicText(
        [
          item.title,
          item.statusLabel,
          item.service.name,
          item.student?.fullName,
          item.student?.nationalId,
          item.student?.meta,
        ]
          .filter(Boolean)
          .join(" "),
      );

      return searchableText.includes(cleanQuery);
    });
  }, [cases, filter, query]);

  return (
    <MobileAppShell activeSection="cases">
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-[1.8rem] bg-sky-100/80 p-4 text-slate-950 shadow-xl shadow-sky-100">
          <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-sky-200/70 blur-2xl" />
          <div className="absolute -bottom-16 right-10 h-36 w-36 rounded-full bg-cyan-100/80 blur-2xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-sky-700">الحالات</p>
                <h1 className="mt-1 text-[1.7rem] font-black leading-tight tracking-tight">
                  متابعة الحالات
                </h1>
              </div>

              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
                <MobileIcon name="check" className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white/75 p-2.5 text-center ring-1 ring-sky-100">
                <p className="text-xl font-black">{stats.total}</p>
                <p className="mt-0.5 text-[10px] font-bold text-slate-500">الكل</p>
              </div>

              <div className="rounded-2xl bg-white/75 p-2.5 text-center ring-1 ring-sky-100">
                <p className="text-xl font-black">{stats.drafts}</p>
                <p className="mt-0.5 text-[10px] font-bold text-slate-500">مسودات</p>
              </div>

              <div className="rounded-2xl bg-white/75 p-2.5 text-center ring-1 ring-sky-100">
                <p className="text-xl font-black">{stats.reports}</p>
                <p className="mt-0.5 text-[10px] font-bold text-slate-500">تقارير</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.45rem] bg-white/80 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
            <MobileIcon name="search" className="h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم الطالب أو الحالة"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </section>

        <section className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2">
            {[
              { id: "all", label: "الكل" },
              { id: "drafts", label: "المسودات" },
              { id: "submitted", label: "المكتملة" },
              { id: "reports", label: "لها تقارير" },
              { id: "evidence", label: "لها شواهد" },
            ].map((item) => {
              const active = filter === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id as CaseFilter)}
                  className={[
                    "h-9 shrink-0 rounded-full px-4 text-xs font-black transition",
                    active
                      ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100"
                      : "bg-white/80 text-slate-500 ring-1 ring-white/90",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2.5">
          {filteredCases.length > 0 ? (
            filteredCases.map((caseItem) => (
              <CaseCard key={caseItem.id} caseItem={caseItem} />
            ))
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </MobileAppShell>
  );
}