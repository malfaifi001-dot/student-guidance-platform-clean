"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  TimetableFeasibilityIssue,
  TimetableFeasibilityReport,
} from "@/lib/timetable-v2/feasibility/feasibility-types";

type Props = {
  projectId: string;
};

type ApiResponse = {
  ok: boolean;
  fingerprint?: string;
  report?: TimetableFeasibilityReport;
  error?: string;
};

function statusText(
  report: TimetableFeasibilityReport,
) {
  if (
    report.status ===
    "PROVABLY_INFEASIBLE"
  ) {
    return {
      title: "يوجد تعارض يمنع الحل",
      tone: "error" as const,
    };
  }

  if (
    report.status ===
    "INVALID_PROBLEM"
  ) {
    return {
      title: "بيانات المشروع تحتاج مراجعة",
      tone: "error" as const,
    };
  }

  return {
    title: "لا توجد تناقضات مؤكدة",
    tone: "success" as const,
  };
}

function EvidenceRows({
  issue,
}: {
  issue: TimetableFeasibilityIssue;
}) {
  const evidence =
    issue.evidence;

  const rows = [
    evidence.required !== undefined
      ? ["المطلوب", evidence.required]
      : null,

    evidence.capacity !== undefined
      ? ["السعة", evidence.capacity]
      : null,

    evidence.availableDays !== undefined
      ? ["الأيام المتاحة", evidence.availableDays]
      : null,

    evidence.availableSlots !== undefined
      ? ["الحصص المتاحة", evidence.availableSlots]
      : null,

    evidence.limit !== undefined
      ? ["الحد", evidence.limit]
      : null,
  ].filter(
    (
      row,
    ): row is [
      string,
      string | number,
    ] => Boolean(
      row,
    ),
  );

  if (
    rows.length ===
    0
  ) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {rows.map(
        ([label, value]) => (
          <div
            key={
              label
            }
            className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"
          >
            <span className="text-slate-400">
              {
                label
              }
            </span>

            <span className="mr-2 font-bold text-slate-900">
              {
                value
              }
            </span>
          </div>
        ),
      )}
    </div>
  );
}

function IssueList({
  issues,
}: {
  issues:
    TimetableFeasibilityIssue[];
}) {
  if (
    issues.length ===
    0
  ) {
    return (
      <div className="py-5 text-sm text-slate-400">
        لا توجد مشاكل
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {issues.map(
        (
          issue,
          index,
        ) => (
          <article
            key={
              `${issue.code}-${issue.entityId ?? "none"}-${index}`
            }
            className="py-4 first:pt-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <span
                className={[
                  "mt-2 h-2 w-2 shrink-0 rounded-full",
                  issue.severity ===
                  "ERROR"
                    ? "bg-red-500"
                    : issue.severity ===
                        "WARNING"
                      ? "bg-amber-500"
                      : "bg-[#3478B8]",
                ].join(
                  " ",
                )}
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-6 text-slate-900">
                  {
                    issue.message
                  }
                </p>

                <EvidenceRows
                  issue={
                    issue
                  }
                />
              </div>
            </div>
          </article>
        ),
      )}
    </div>
  );
}

export function TimetableV3FeasibilityWorkspace({
  projectId,
}: Props) {
  const [
    report,
    setReport,
  ] =
    useState<TimetableFeasibilityReport | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  async function load() {
    setLoading(
      true,
    );

    setError(
      null,
    );

    try {
      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v3/projects/${projectId}/feasibility`,
          {
            cache:
              "no-store",
          },
        );

      const data =
        await response.json() as ApiResponse;

      if (
        !response.ok ||
        !data.ok ||
        !data.report
      ) {
        throw new Error(
          data.error ||
            "FEASIBILITY_ANALYSIS_FAILED",
        );
      }

      setReport(
        data.report,
      );
    }
    catch (
      cause
    ) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر تنفيذ الفحص",
      );
    }
    finally {
      setLoading(
        false,
      );
    }
  }

  useEffect(
    () => {
      void load();
    },
    [projectId],
  );

  const groups =
    useMemo(
      () => {
        const issues =
          report?.issues ??
          [];

        const contradictions =
          issues.filter(
            (issue) =>
              issue.proven,
          );

        const capacity =
          issues.filter(
            (issue) =>
              issue.category ===
                "CAPACITY" ||
              issue.evidence.capacity !==
                undefined,
          );

        const availability =
          issues.filter(
            (issue) =>
              issue.evidence.availableDays !==
                undefined ||
              issue.evidence.availableSlots !==
                undefined,
          );

        return {
          contradictions,
          capacity,
          availability,
        };
      },
      [report],
    );

  if (
    loading
  ) {
    return (
      <main
        dir="rtl"
        className="mx-auto flex min-h-[55vh] w-full max-w-5xl items-center justify-center px-4"
      >
        <div className="text-sm font-medium text-slate-400">
          جاري فحص الإمكانية...
        </div>
      </main>
    );
  }

  if (
    error ||
    !report
  ) {
    return (
      <main
        dir="rtl"
        className="mx-auto w-full max-w-5xl px-4 py-10"
      >
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-7">
          <div className="font-bold text-red-700">
            تعذر تنفيذ الفحص
          </div>

          <div className="mt-2 text-sm text-red-600">
            {
              error
            }
          </div>

          <button
            type="button"
            onClick={
              () =>
                void load()
            }
            className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </main>
    );
  }

  const status =
    statusText(
      report,
    );

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10"
    >
      <header className="mb-8">
        <p className="text-xs font-black text-[#3478B8]">خدمات مدير المدرسة</p>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          فحص الإمكانية
        </h1>
      </header>

      <section
        className={[
          "rounded-3xl border px-6 py-7 sm:px-8",
          status.tone ===
          "success"
            ? "border-[#CCE4F2] bg-[#F5FBFE]"
            : "border-red-200 bg-red-50/60",
        ].join(
          " ",
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={[
              "flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold",
              status.tone ===
              "success"
                ? "bg-[#3478B8] text-white"
                : "bg-red-600 text-white",
            ].join(
              " ",
            )}
          >
            {
              status.tone ===
              "success"
                ? "✓"
                : "!"
            }
          </div>

          <div>
            <div className="text-lg font-bold text-slate-950">
              {
                status.title
              }
            </div>

            <div className="mt-1 text-sm text-slate-500">
              {
                report.summary.provenContradictions
              }
              {" "}
              تناقض مؤكد
              {" · "}
              {
                report.summary.warnings
              }
              {" "}
              ملاحظات
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold text-slate-950">
              التناقضات المؤكدة
            </h2>

            <span className="text-xs text-slate-400">
              {
                groups.contradictions.length
              }
            </span>
          </div>

          <IssueList
            issues={
              groups.contradictions
            }
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold text-slate-950">
              السعة
            </h2>

            <span className="text-xs text-slate-400">
              {
                groups.capacity.length
              }
            </span>
          </div>

          <IssueList
            issues={
              groups.capacity
            }
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold text-slate-950">
              التوفر
            </h2>

            <span className="text-xs text-slate-400">
              {
                groups.availability.length
              }
            </span>
          </div>

          <IssueList
            issues={
              groups.availability
            }
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold text-slate-950">
              ملخص الفحص
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-slate-400">
                الحصص المطلوبة
              </div>

              <div className="mt-1 text-xl font-bold text-slate-950">
                {
                  report.summary.requiredSessions
                }
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-slate-400">
                الحصص المتاحة
              </div>

              <div className="mt-1 text-xl font-bold text-slate-950">
                {
                  report.summary.schoolSlots
                }
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-slate-400">
                المعلمون
              </div>

              <div className="mt-1 text-xl font-bold text-slate-950">
                {
                  report.summary.teachers
                }
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-slate-400">
                الإسنادات
              </div>

              <div className="mt-1 text-xl font-bold text-slate-950">
                {
                  report.summary.assignments
                }
              </div>
            </div>
          </div>
        </section>
      </div>

    </main>
  );
}
