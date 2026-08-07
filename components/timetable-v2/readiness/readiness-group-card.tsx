"use client";

import Link from "next/link";

import type {
  TimetableV2ReadinessCategory,
  TimetableV2ReadinessIssue,
} from "@/lib/timetable-v2/readiness-analysis";

import type {
  ReadinessGroup,
} from "@/lib/timetable-v2/readiness-groups";

export const INITIAL_VISIBLE_ISSUES = 10;

const CATEGORY_LABELS: Record<
  TimetableV2ReadinessCategory,
  string
> = {
  PROJECT:
    "المشروع",

  ASSIGNMENTS:
    "الإسناد",

  TEACHERS:
    "المعلمون",

  CLASSES:
    "الفصول",

  SUBJECTS:
    "المواد",

  CONSTRAINTS:
    "القيود",

  TIME:
    "الأوقات",
};

const SEVERITY_STYLE: Record<
  string,
  {
    card: string;
    badge: string;
    dot: string;
    heading: string;
  }
> = {
  ERROR: {
    card: "border-rose-200",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-600",
    heading: "text-rose-900",
  },

  WARNING: {
    card: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    heading: "text-amber-900",
  },

  INFO: {
    card: "border-sky-200",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-600",
    heading: "text-sky-900",
  },
};

const SEVERITY_LABEL: Record<string, string> = {
  ERROR: "خطأ يمنع الإنشاء",
  WARNING: "تحذير",
  INFO: "تحسين",
};

function IssueRow({
  issue,
}: {
  issue: TimetableV2ReadinessIssue;
}) {
  return (
    <div className="grid gap-3 py-3 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "rounded-full px-2 py-1 text-[10px] font-black",
              issue.severity === "ERROR"
                ? "bg-rose-100 text-rose-700"
                : issue.severity === "WARNING"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-sky-100 text-sky-700",
            ].join(" ")}
          >
            {CATEGORY_LABELS[issue.category]}
          </span>

          {issue.entityName ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
              {issue.entityName}
            </span>
          ) : null}
        </div>

        <h4 className="mt-2 text-sm font-black text-slate-950">
          {issue.title}
        </h4>

        <p className="mt-1 max-w-4xl text-xs leading-6 text-slate-500">
          {issue.description}
        </p>
      </div>

      {issue.href ? (
        <Link
          href={issue.href}
          className="h-9 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[11px] font-black text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
        >
          {issue.actionLabel ?? "مراجعة"}
        </Link>
      ) : null}
    </div>
  );
}

export function ReadinessGroupCard({
  group,
  expanded,
  showAll,
  onToggle,
  onShowAll,
}: {
  group: ReadinessGroup;
  expanded: boolean;
  showAll: boolean;
  onToggle: () => void;
  onShowAll: () => void;
}) {
  const style =
    SEVERITY_STYLE[group.severity];

  const visible =
    showAll
      ? group.issues
      : group.issues.slice(
          0,
          INITIAL_VISIBLE_ISSUES,
        );

  const remaining =
    group.issues.length -
    visible.length;

  return (
    <article
      id={`readiness-group-${group.code}`}
      className={[
        "overflow-hidden rounded-3xl border bg-white shadow-sm transition",
        style.card,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 p-5 text-right transition hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "rounded-full px-2 py-1 text-[10px] font-black",
                style.badge,
              ].join(" ")}
            >
              {SEVERITY_LABEL[group.severity]}
            </span>

            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
              {CATEGORY_LABELS[group.category]}
            </span>

            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  style.dot,
                ].join(" ")}
              />

              {group.code}
            </span>
          </div>

          <h3
            className={[
              "mt-2 text-lg font-black",
              style.heading,
            ].join(" ")}
          >
            {group.title}
          </h3>

          <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-500">
            {group.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className={[
              "flex h-11 min-w-[3.5rem] items-center justify-center rounded-2xl px-3 text-xl font-black",
              style.badge,
            ].join(" ")}
          >
            {group.count}
          </span>

          <span
            className={[
              "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition",
              expanded
                ? "rotate-180"
                : "",
            ].join(" ")}
            aria-hidden
          >
            ▾
          </span>
        </div>
      </button>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
        {group.primaryHref ? (
          <Link
            href={group.primaryHref}
            className="h-9 rounded-xl bg-teal-700 px-4 py-2 text-center text-[11px] font-black text-white transition hover:bg-teal-800"
          >
            {group.primaryActionLabel}
          </Link>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-black text-slate-700 transition hover:bg-slate-50"
        >
          {expanded
            ? "إخفاء التفاصيل"
            : "عرض التفاصيل"}
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-2">
          <div className="divide-y divide-slate-100">
            {visible.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
              />
            ))}
          </div>

          {remaining > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="text-[11px] font-bold text-slate-500">
                عرض أول {visible.length} من أصل {group.issues.length} عنصر
              </span>

              <button
                type="button"
                onClick={onShowAll}
                className="h-9 rounded-xl bg-slate-950 px-4 text-[11px] font-black text-white transition hover:bg-slate-800"
              >
                عرض الكل ({remaining})
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
