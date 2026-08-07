"use client";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  useMemo,
  useState,
} from "react";

import type {
  TimetableV2ReadinessIssue,
  TimetableV2ReadinessSeverity,
} from "@/lib/timetable-v2/readiness-analysis";

import {
  getReadinessBlockers,
  groupReadinessIssues,
} from "@/lib/timetable-v2/readiness-groups";

import {
  ReadinessGroupCard,
} from "./readiness/readiness-group-card";

import {
  ReadinessBlockersSummary,
} from "./readiness/readiness-blockers-summary";

type Props = {
  project: {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
  };

  score: number;

  canGenerate: boolean;

  issues:
    TimetableV2ReadinessIssue[];

  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;

    daysCount: number;
    teachingPeriodsCount: number;
    breaksCount: number;
    weeklySlotCount: number;

    teachersCount: number;
    classesCount: number;
    subjectsCount: number;

    requiredLessons: number;
    assignedLessons: number;

    fullyAssignedRows: number;
    underAssignedRows: number;
    overAssignedRows: number;

    assignmentsCount: number;

    constraintsCount: number;
    disabledConstraints: number;
    hardConstraintCount: number;
    softConstraintCount: number;

    hardConflictCount: number;

    overloadedTeachers: number;

    teachersWithoutSpecialty: number;
  };
};

type Filter =
  | "ALL"
  | TimetableV2ReadinessSeverity;

function scoreTone(
  score: number,
) {
  if (
    score >= 90
  ) {
    return {
      label:
        "جاهزية ممتازة",

      ring:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (
    score >= 70
  ) {
    return {
      label:
        "جاهزية جيدة",

      ring:
        "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label:
      "يحتاج مراجعة",

    ring:
      "border-rose-200 bg-rose-50 text-rose-700",
  };
}

export function TimetableV2ReadinessWorkspace({
  project,
  score,
  canGenerate,
  issues,
  summary,
}: Props) {
  const router =
    useRouter();

  const [
    filter,
    setFilter,
  ] = useState<Filter>(
    "ALL",
  );

  const [
    expandedOverrides,
    setExpandedOverrides,
  ] = useState<string[]>(
    [],
  );

  const [
    collapsedOverrides,
    setCollapsedOverrides,
  ] = useState<string[]>(
    [],
  );

  const [
    showAll,
    setShowAll,
  ] = useState<
    Record<string, boolean>
  >({});

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const groups =
    useMemo(
      () =>
        groupReadinessIssues(
          issues,
          project.id,
        ),
      [
        issues,
        project.id,
      ],
    );

  const filteredGroups =
    useMemo(
      () =>
        filter ===
        "ALL"
          ? groups
          : groups.filter(
              (group) =>
                group.severity ===
                filter,
            ),
      [
        groups,
        filter,
      ],
    );

  const blockers =
    useMemo(
      () =>
        getReadinessBlockers(
          groups,
        ),
      [groups],
    );

  const defaultExpandedByCode =
    useMemo(() => {
      const map: Record<
        string,
        boolean
      > = {};

      for (
        const group of groups
      ) {
        map[group.code] =
          group.defaultExpanded;
      }

      return map;
    }, [groups]);

  const isExpandedCode = (
    code: string,
  ) => {
    if (
      expandedOverrides.includes(
        code,
      )
    ) {
      return true;
    }

    if (
      collapsedOverrides.includes(
        code,
      )
    ) {
      return false;
    }

    return (
      defaultExpandedByCode[
        code
      ] ?? false
    );
  };

  const toggleGroup = (
    code: string,
  ) => {
    const currentlyExpanded =
      isExpandedCode(code);

    if (
      currentlyExpanded
    ) {
      setCollapsedOverrides(
        (current) =>
          current.includes(
            code,
          )
            ? current
            : [
                ...current,
                code,
              ],
      );

      setExpandedOverrides(
        (current) =>
          current.filter(
            (item) =>
              item !== code,
          ),
      );

      return;
    }

    setExpandedOverrides(
      (current) =>
        current.includes(
          code,
        )
          ? current
          : [
              ...current,
              code,
            ],
    );

    setCollapsedOverrides(
      (current) =>
        current.filter(
          (item) =>
            item !== code,
        ),
    );
  };

  const revealGroup = (
    code: string,
  ) => {
    setExpandedOverrides(
      (current) =>
        current.includes(
          code,
        )
          ? current
          : [
              ...current,
              code,
            ],
    );

    setCollapsedOverrides(
      (current) =>
        current.filter(
          (item) =>
            item !== code,
        ),
    );

    setShowAll((current) => ({
      ...current,
      [code]: true,
    }));

    window.setTimeout(
      () => {
        document
          .getElementById(
            `readiness-group-${code}`,
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block:
              "start",
          });
      },
      80,
    );
  };

  const refreshReadiness =
    () => {
      if (refreshing) {
        return;
      }

      setRefreshing(true);

      router.refresh();

      window.setTimeout(
        () =>
          setRefreshing(false),
        1200,
      );
    };

  const tone =
    scoreTone(score);

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-[1500px] space-y-5 pb-20"
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-l from-sky-50 via-white to-teal-50 p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-black text-sky-700">
                الخطوة 5
              </div>

              <h1 className="mt-3 text-3xl font-black text-slate-950">
                فحص البيانات والجاهزية
              </h1>

              <p className="mt-2 text-sm leading-7 text-slate-500">
                {project.name}
                {" • "}
                {project.academicYear}
                {" • "}
                {project.semester}
              </p>

              <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">
                يفحص النظام الإسناد والأحمال والقيود والطاقة الزمنية قبل محاولة إنشاء الجدول.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refreshReadiness}
                disabled={refreshing}
                className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {refreshing
                  ? "جاري إعادة الفحص..."
                  : "إعادة الفحص"}
              </button>

              <Link
                href={`/dashboard/timetable-v2/${project.id}`}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                العودة للمشروع
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[260px_1fr]">
            <div
              className={[
                "rounded-3xl border p-6 text-center",
                tone.ring,
              ].join(" ")}
            >
              <div className="text-xs font-black">
                جاهزية الإنشاء
              </div>

              <div className="mt-3 text-5xl font-black">
                {score}%
              </div>

              <div className="mt-2 text-sm font-black">
                {tone.label}
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-current transition-all"
                  style={{
                    width:
                      `${score}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="الإسناد"
                value={`${summary.assignedLessons}/${summary.requiredLessons}`}
                hint={
                  summary.underAssignedRows ===
                    0 &&
                  summary.overAssignedRows ===
                    0
                    ? "مكتمل"
                    : `${summary.underAssignedRows} ناقص • ${summary.overAssignedRows} زائد`
                }
                tone={
                  summary.underAssignedRows ===
                    0 &&
                  summary.overAssignedRows ===
                    0
                    ? "success"
                    : "danger"
                }
              />

              <Metric
                label="المعلمون"
                value={
                  summary.teachersCount
                }
                hint={
                  summary.overloadedTeachers >
                  0
                    ? `${summary.overloadedTeachers} متجاوز`
                    : "الأحمال ضمن الحدود"
                }
                tone={
                  summary.overloadedTeachers >
                  0
                    ? "danger"
                    : "success"
                }
              />

              <Metric
                label="القيود"
                value={
                  summary.constraintsCount
                }
                hint={`${summary.hardConstraintCount} إلزامي • ${summary.softConstraintCount} تفضيل`}
                tone={
                  summary.hardConflictCount >
                  0
                    ? "danger"
                    : "default"
                }
              />

              <Metric
                label="التعارضات"
                value={
                  summary.hardConflictCount
                }
                hint={
                  summary.hardConflictCount >
                  0
                    ? "تحتاج معالجة"
                    : "لا توجد تعارضات مباشرة"
                }
                tone={
                  summary.hardConflictCount >
                  0
                    ? "danger"
                    : "success"
                }
              />

              <Metric
                label="الفصول"
                value={
                  summary.classesCount
                }
                hint="فصول نشطة"
              />

              <Metric
                label="المواد"
                value={
                  summary.subjectsCount
                }
                hint={`${summary.fullyAssignedRows} خطة مكتملة الإسناد`}
              />

              <Metric
                label="الخانات الأسبوعية"
                value={
                  summary.weeklySlotCount
                }
                hint={`${summary.daysCount} أيام × ${summary.teachingPeriodsCount} حصص`}
              />

              <Metric
                label="الفسحات"
                value={
                  summary.breaksCount
                }
                hint={`${summary.disabledConstraints} قيود معطلة`}
              />
            </div>
          </div>
        </div>
      </section>

      <ReadinessBlockersSummary
        blockers={blockers}
        onSelect={revealGroup}
      />

      <section
        className={[
          "rounded-3xl border p-5 shadow-sm",
          canGenerate
            ? "border-emerald-200 bg-emerald-50"
            : "border-rose-200 bg-rose-50",
        ].join(" ")}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div
              className={[
                "text-lg font-black",
                canGenerate
                  ? "text-emerald-900"
                  : "text-rose-900",
              ].join(" ")}
            >
              {canGenerate
                ? "المشروع جاهز للانتقال إلى إنشاء الجدول"
                : "توجد أخطاء تمنع إنشاء الجدول"}
            </div>

            <p
              className={[
                "mt-1 text-xs leading-6",
                canGenerate
                  ? "text-emerald-700"
                  : "text-rose-700",
              ].join(" ")}
            >
              {canGenerate
                ? "لا توجد أخطاء إلزامية؛ يمكنك المتابعة إلى محرك الإنشاء في الخطوة التالية."
                : "عالج الأخطاء الإلزامية أولًا ثم أعد فحص البيانات."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/timetable-v2/${project.id}/constraints`}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
            >
              مراجعة القيود
            </Link>

            <button
              type="button"
              disabled
              title="سيتم بناء محرك الإنشاء في الخطوة التالية"
              className={[
                "h-11 rounded-xl px-5 text-sm font-black",
                canGenerate
                  ? "bg-slate-950 text-white opacity-70"
                  : "bg-slate-200 text-slate-400",
              ].join(" ")}
            >
              إنشاء الجدول
            </button>
          </div>
        </div>
      </section>

      <section className="sticky top-3 z-20 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={
              filter === "ALL"
            }
            label="الكل"
            count={
              issues.length
            }
            onClick={() =>
              setFilter("ALL")
            }
          />

          <FilterButton
            active={
              filter === "ERROR"
            }
            label="أخطاء تمنع الإنشاء"
            count={
              summary.errorCount
            }
            onClick={() =>
              setFilter("ERROR")
            }
            tone="danger"
          />

          <FilterButton
            active={
              filter ===
              "WARNING"
            }
            label="تحذيرات"
            count={
              summary.warningCount
            }
            onClick={() =>
              setFilter(
                "WARNING",
              )
            }
            tone="warning"
          />

          <FilterButton
            active={
              filter === "INFO"
            }
            label="تحسينات"
            count={
              summary.infoCount
            }
            onClick={() =>
              setFilter("INFO")
            }
          />
        </div>
      </section>

      {issues.length ===
      0 ? (
        <section className="rounded-3xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-2xl">
            ✓
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-950">
            لا توجد ملاحظات
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            البيانات الحالية اجتازت جميع فحوصات الجاهزية.
          </p>
        </section>
      ) : filteredGroups.length ===
        0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            لا توجد نتائج بهذا التصنيف
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            اختر تصنيفًا آخر أو اعرض الكل.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(
            (group) => (
              <ReadinessGroupCard
                key={group.id}
                group={group}
                expanded={isExpandedCode(
                  group.code,
                )}
                showAll={
                  showAll[
                    group.code
                  ] === true
                }
                onToggle={() =>
                  toggleGroup(
                    group.code,
                  )
                }
                onShowAll={() =>
                  setShowAll(
                    (current) => ({
                      ...current,
                      [group.code]:
                        true,
                    }),
                  )
                }
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;

  tone?:
    | "default"
    | "success"
    | "danger";
}) {
  const style =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50"
        : "border-slate-200 bg-white";

  return (
    <div
      className={[
        "rounded-2xl border p-4",
        style,
      ].join(" ")}
    >
      <div className="text-xs font-bold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </div>

      {hint ? (
        <div className="mt-1 text-[11px] leading-5 text-slate-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
  tone = "default",
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;

  tone?:
    | "default"
    | "danger"
    | "warning";
}) {
  const activeStyle =
    tone === "danger"
      ? "bg-rose-700 text-white"
      : tone === "warning"
        ? "bg-amber-500 text-white"
        : "bg-slate-950 text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-10 rounded-xl px-3 text-xs font-black transition",
        active
          ? activeStyle
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
      {" "}
      <span className="opacity-70">
        ({count})
      </span>
    </button>
  );
}
