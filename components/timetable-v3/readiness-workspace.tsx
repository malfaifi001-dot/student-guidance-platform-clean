"use client";

import {
  useRouter,
} from "next/navigation";

type ReadinessIssue = {
  severity:
    | "ERROR"
    | "WARNING"
    | "INFO";

  category:
    string;

  code:
    string;

  title?: string;
  message?: string;
  description?: string;

  actionLabel?: string;
};

type Props = {
  projectId:
    string;

  score:
    number;

  canGenerate:
    boolean;

  issues:
    ReadinessIssue[];
};

function issueText(
  issue:
    ReadinessIssue,
) {
  return (
    issue.message ||
    issue.description ||
    issue.title ||
    issue.actionLabel ||
    issue.code
  );
}

function issueTitle(
  issue:
    ReadinessIssue,
) {
  if (
    issue.title
  ) {
    return issue.title;
  }

  if (
    issue.severity ===
    "ERROR"
  ) {
    return "يحتاج إصلاح";
  }

  if (
    issue.severity ===
    "WARNING"
  ) {
    return "ملاحظة";
  }

  return "تنبيه";
}

function resolveActionHref(
  projectId:
    string,
  issue:
    ReadinessIssue,
) {
  const code =
    issue.code
      .toUpperCase();

  const category =
    issue.category
      .toUpperCase();

  if (
    code.includes(
      "ASSIGN",
    ) ||
    code.includes(
      "LOAD",
    ) ||
    category.includes(
      "ASSIGN",
    )
  ) {
    return `/dashboard/timetable-v3/${projectId}/assignments`;
  }

  if (
    code.includes(
      "CONSTRAINT",
    ) ||
    code.includes(
      "UNAVAILABLE",
    ) ||
    code.includes(
      "BLOCKED",
    ) ||
    category.includes(
      "CONSTRAINT",
    )
  ) {
    return `/dashboard/timetable-v3/${projectId}/constraints`;
  }

  return `/dashboard/timetable-v3/${projectId}/setup`;
}

export function TimetableV3ReadinessWorkspace(
  {
    projectId,
    score,
    canGenerate,
    issues,
  }: Props,
) {
  const router =
    useRouter();

  const blockers =
    issues.filter(
      (issue) =>
        issue.severity ===
        "ERROR",
    );

  const warnings =
    issues.filter(
      (issue) =>
        issue.severity ===
        "WARNING",
    );

  const visibleIssues = [
    ...blockers,
    ...warnings,
  ];

  const statusLabel =
    canGenerate
      ? visibleIssues.length >
        0
        ? "جاهز مع ملاحظات"
        : "جاهز للتحليل"
      : "غير جاهز بعد";

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10"
    >
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          الجاهزية
        </h1>
      </header>

      <section
        className={[
          "rounded-3xl border p-6 sm:p-8",
          canGenerate
            ? "border-[#CFE5F3] bg-[#F5FBFE]"
            : "border-amber-200 bg-amber-50/50",
        ].join(
          " ",
        )}
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div
              className={[
                "text-sm font-semibold",
                canGenerate
                  ? "text-[#3478B8]"
                  : "text-amber-700",
              ].join(
                " ",
              )}
            >
              {
                statusLabel
              }
            </div>

            <div className="mt-2 text-5xl font-bold tracking-tight text-slate-950">
              {
                Math.round(
                  score,
                )
              }
              <span className="mr-1 text-2xl text-slate-400">
                %
              </span>
            </div>
          </div>

          <div className="text-left text-sm text-slate-500">
            {blockers.length >
            0 ? (
              <span className="font-semibold text-red-600">
                {
                  blockers.length
                }
                {" "}
                تحتاج إصلاح
              </span>
            ) : warnings.length >
              0 ? (
              <span>
                {
                  warnings.length
                }
                {" "}
                ملاحظات
              </span>
            ) : (
              <span className="font-semibold text-emerald-600">
                لا توجد مشاكل
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white">
          <div
            className={[
              "h-full rounded-full transition-all",
              canGenerate
                ? "bg-[#3478B8]"
                : "bg-amber-500",
            ].join(
              " ",
            )}
            style={{
              width:
                `${Math.max(
                  0,
                  Math.min(
                    100,
                    score,
                  ),
                )}%`,
            }}
          />
        </div>
      </section>

      {visibleIssues.length >
      0 ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-950">
              يحتاج انتباه
            </h2>

            <span className="text-xs text-slate-400">
              {
                visibleIssues.length
              }
            </span>
          </div>

          <div className="space-y-2">
            {visibleIssues.map(
              (
                issue,
                index,
              ) => {
                const error =
                  issue.severity ===
                  "ERROR";

                return (
                  <div
                    key={
                      `${issue.code}-${index}`
                    }
                    className={[
                      "flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white px-4 py-4 sm:px-5",
                      error
                        ? "border-red-200"
                        : "border-amber-200",
                    ].join(
                      " ",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "h-2 w-2 shrink-0 rounded-full",
                            error
                              ? "bg-red-500"
                              : "bg-amber-500",
                          ].join(
                            " ",
                          )}
                        />

                        <div className="font-semibold text-slate-900">
                          {
                            issueTitle(
                              issue,
                            )
                          }
                        </div>
                      </div>

                      <div className="mt-1 pr-4 text-sm leading-6 text-slate-500">
                        {
                          issueText(
                            issue,
                          )
                        }
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        () =>
                          router.push(
                            resolveActionHref(
                              projectId,
                              issue,
                            ),
                          )
                      }
                      className="h-9 shrink-0 rounded-xl border border-[#CFE1ED] bg-white px-4 text-xs font-semibold text-[#3478B8] transition hover:bg-[#F4FAFD]"
                    >
                      {
                        issue.actionLabel ||
                        "إصلاح"
                      }
                    </button>
                  </div>
                );
              },
            )}
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/60 px-5 py-8 text-center">
          <div className="text-lg font-bold text-emerald-700">
            المشروع جاهز
          </div>
        </section>
      )}

    </div>
  );
}
