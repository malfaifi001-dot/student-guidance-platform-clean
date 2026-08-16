"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  timetableV3StatusLabel,
} from "@/lib/timetable-v3/display-labels";

type SuccessResult = {
  success: true;

  schedule: {
    id: string;
    version: number;
    status: string;
    generatedAt:
      string | Date;
  };

  result: {
    engine: string;
    score: number;
    completeness: number;
    sessions: number;
    hardViolations: number;
    softPenalty: number;
    durationMs: number;
    seed: number;
  };
};

type FailureResult = {
  success: false;
  code?: string;
  error?: string;
};

type GenerationFailure = {
  code?: string;
  error: string;
};

type FailurePresentation = {
  title: string;
  text: string;
  action?: {
    label: string;
    href?: string;
  };
};

type ApiResult =
  | SuccessResult
  | FailureResult;

type Props = {
  projectId: string;
  savedSchedule: null | {
    id: string;
    version: number;
    status: string;
    generatedAt: string;
    sessions: number;
  };
  initialVersions: ScheduleVersion[];
};

type ScheduleVersion = {
  id: string;
  version: number;
  status: string;
  isCurrent: boolean;
  engine: string;
  generatedAt: string;
  sessions: number;
};

type VersionsResponse = {
  ok: boolean;
  workspace?: {
    versions: ScheduleVersion[];
  };
};

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "medium",
  timeStyle: "short",
});

function progressStatus(progress: number) {
  if (progress < 15) return "تجهيز بيانات المشروع";
  if (progress < 30) return "فحص الجاهزية";
  if (progress < 45) return "فحص الإمكانية";
  if (progress < 90) return "جاري إنشاء الجدول";
  if (progress < 100) return "التحقق وحفظ النسخة";
  return "تم إنشاء الجدول وحفظ النسخة بنجاح";
}

function estimatedProgress(elapsedMs: number) {
  const seconds = elapsedMs / 1000;
  if (seconds < 6) return Math.floor((seconds / 6) * 15);
  if (seconds < 12) return Math.floor(15 + ((seconds - 6) / 6) * 15);
  if (seconds < 18) return Math.floor(30 + ((seconds - 12) / 6) * 15);
  if (seconds < 55) return Math.floor(45 + ((seconds - 18) / 37) * 45);
  return Math.min(99, Math.floor(90 + (seconds - 55) * 0.3));
}

function formatDuration(
  durationMs: number,
) {
  const seconds =
    Math.max(
      0,
      Math.round(
        durationMs / 1000,
      ),
    );

  if (
    seconds < 60
  ) {
    return `${seconds} ث`;
  }

  const minutes =
    Math.floor(
      seconds / 60,
    );

  const rest =
    seconds % 60;

  return rest > 0
    ? `${minutes} د ${rest} ث`
    : `${minutes} د`;
}

function getFailurePresentation(
  failure: GenerationFailure,
  projectId: string,
): FailurePresentation {
  switch (
    failure.code
  ) {
    case "READINESS_BLOCKED":
      return {
        title:
          "المشروع غير جاهز للإنشاء",
        text:
          "أكمل البيانات المطلوبة ثم أعد المحاولة.",
        action: {
          label:
            "فتح الجاهزية",
          href:
            `/dashboard/timetable-v3/${projectId}/readiness`,
        },
      };

    case "FEASIBILITY_BLOCKED":
      return {
        title:
          "يوجد تعارض يمنع إنشاء الجدول",
        text:
          "فحص الإمكانية أثبت وجود تناقض يحتاج معالجة.",
        action: {
          label:
            "فتح فحص الإمكانية",
          href:
            `/dashboard/timetable-v3/${projectId}/feasibility`,
        },
      };

    case "TIMEFOLD_FAILED":
      return {
        title:
          "لم يتم العثور على جدول صالح",
        text:
          "راجع القيود والتوزيع ثم أعد المحاولة.",
        action: {
          label:
            "مراجعة القيود",
          href:
            `/dashboard/timetable-v3/${projectId}/constraints`,
        },
      };

    case "TIMEFOLD_UNAVAILABLE":
      return {
        title:
          "خدمة إنشاء الجدول غير متاحة",
        text:
          "تعذر الاتصال بخدمة إنشاء الجدول. أعد المحاولة بعد قليل.",
        action: {
          label:
            "إعادة المحاولة",
        },
      };

    case "TIMEFOLD_REQUEST_FAILED":
      return {
        title:
          "تعذر تنفيذ طلب إنشاء الجدول",
        text:
          "أعد المحاولة بعد قليل.",
        action: {
          label:
            "إعادة المحاولة",
        },
      };

      default:
        return {
          title:
            "تعذر إنشاء الجدول",
          text:
            "راجع بيانات المشروع ثم أعد المحاولة.",
        action: {
          label:
            "إعادة المحاولة",
        },
      };
  }
}

export function TimetableV3TimefoldWorkspace({
  projectId,
  savedSchedule,
  initialVersions,
}: Props) {
  const router =
    useRouter();

  const [
    running,
    setRunning,
  ] =
    useState(false);

  const [
    result,
    setResult,
  ] =
    useState<SuccessResult | null>(
      null,
    );

  const [
    failure,
    setFailure,
  ] =
    useState<GenerationFailure | null>(
      null,
    );

  const [progress, setProgress] = useState(0);
  const [generationStarted, setGenerationStarted] = useState(false);
  const [versions, setVersions] = useState(initialVersions);
  const generationStartedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running || generationStartedAt.current === null) return;

    const timer = window.setInterval(() => {
      const next = estimatedProgress(Date.now() - generationStartedAt.current!);
      setProgress((current) => Math.max(current, next));
    }, 500);

    return () => window.clearInterval(timer);
  }, [running]);

  const failurePresentation =
    failure
      ? getFailurePresentation(
          failure,
          projectId,
        )
      : null;

  const availableSchedule =
    result?.schedule ??
    savedSchedule;

  const availableSessions =
    result?.result.sessions ??
    savedSchedule?.sessions;

  async function refreshVersions() {
    const response = await fetch(
      `/api/dashboard/principal/timetable-v3/projects/${projectId}/versions`,
      { cache: "no-store" },
    );
    const data = await response.json() as VersionsResponse;
    if (response.ok && data.ok && data.workspace) {
      setVersions(data.workspace.versions);
    }
  }

  async function finishProgress() {
    await new Promise<void>((resolve) => {
      const timer = window.setInterval(() => {
        setProgress((current) => {
          const next = Math.min(100, current + Math.max(1, Math.ceil((100 - current) / 5)));
          if (next === 100) {
            window.clearInterval(timer);
            window.setTimeout(resolve, 250);
          }
          return next;
        });
      }, 100);
    });
  }

  async function generate() {
    if (
      running
    ) {
      return;
    }

    setRunning(
      true,
    );

    setGenerationStarted(true);
    setProgress(0);
    generationStartedAt.current = Date.now();

    setFailure(
      null,
    );

    try {
      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v3/projects/${projectId}/timefold`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {},
              ),
          },
        );

      const data =
        await response.json() as ApiResult;

      if (
        !response.ok ||
        !data.success
      ) {
        setFailure(
          !data.success
            ? {
                code:
                  data.code,
                error:
                  data.error ||
                  "تعذر إنشاء الجدول.",
              }
            : {
                error:
                  "تعذر إنشاء الجدول.",
              },
        );

        return;
      }

      setResult(
        data,
      );

      await finishProgress();
      try {
        await refreshVersions();
      }
      catch {
        // The persisted result remains usable even if refreshing the list fails.
      }
    }
    catch (
      cause
    ) {
      setFailure(
        {
          error:
            cause instanceof Error
              ? cause.message
              : "تعذر إنشاء الجدول.",
        },
      );
    }
    finally {
      generationStartedAt.current = null;
      setRunning(
        false,
      );
    }
  }

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10"
    >
      <header className="mb-8">
        <p className="text-xs font-black text-[#3478B8]">خدمات مدير المدرسة</p>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          إنشاء الجدول
        </h1>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF7FC] text-lg font-bold text-[#3478B8]">
            ج
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">إنشاء الجدول</h2>
            <p className="mt-1 text-sm text-slate-500">إنشاء نسخة جديدة من الجدول الدراسي</p>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-950">حالة الإنشاء</h2>
            <p className="mt-1 text-sm text-slate-500">
              {generationStarted ? progressStatus(progress) : "جاهز لإنشاء نسخة من الجدول"}
            </p>
          </div>

          {!running ? (
            <button
              type="button"
              onClick={() => void generate()}
              className={availableSchedule
                ? "h-10 rounded-xl border border-[#C9DFEC] bg-white px-4 text-sm font-semibold text-[#3478B8] transition hover:bg-[#F0F8FC]"
                : "h-11 rounded-xl bg-[#3478B8] px-6 text-sm font-bold text-white transition hover:bg-[#2D6BA5]"}
            >
              {availableSchedule ? "إنشاء نسخة جديدة" : "إنشاء الجدول"}
            </button>
          ) : null}
        </div>

        {generationStarted ? (
          <div className="mt-5" aria-live="polite">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>{progressStatus(progress)}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#3478B8] transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {failurePresentation ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50/70 px-5 py-4 text-right">
                <div className="text-sm font-bold text-red-900">
                  {
                    failurePresentation.title
                  }
                </div>

                <div className="mt-1 text-sm leading-6 text-red-700">
                  {
                    failurePresentation.text
                  }
                </div>

                {failurePresentation.action ? (
                  <button
                    type="button"
                    onClick={
                      () => {
                        if (
                          failurePresentation.action?.href
                        ) {
                          router.push(
                            failurePresentation.action.href,
                          );

                          return;
                        }

                        void generate();
                      }
                    }
                    className="mt-3 h-9 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-700 transition hover:bg-red-100"
                  >
                    {
                      failurePresentation.action.label
                    }
                  </button>
                ) : null}
              </div>
        ) : null}
      </section>

      <section className="mt-5 rounded-3xl border border-[#CFE5F3] bg-[#F6FBFE] p-5 sm:p-6">
        <h2 className="font-bold text-slate-950">الجدول المحفوظ الحالي</h2>
        {availableSchedule ? (
          <div className="mt-3">
            <div className="text-sm font-semibold text-slate-900">يوجد جدول محفوظ</div>
            <div className="mt-1 text-sm text-slate-500">
              النسخة {availableSchedule.version} · {availableSessions} حصة · {timetableV3StatusLabel(availableSchedule.status)}
            </div>

            {result && !running ? (
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#DDECF5] pt-5 sm:grid-cols-4">
              <div className="rounded-2xl bg-white p-4">
              <div className="text-xs text-slate-400">
                الاكتمال
              </div>

              <div className="mt-1 text-xl font-bold text-slate-950">
                {
                  Math.round(
                    result.result
                      .completeness *
                      100,
                  )
                }
                %
              </div>
              </div>

              <div className="rounded-2xl bg-white p-4">
              <div className="text-xs text-slate-400">
                المخالفات
              </div>

              <div className="mt-1 text-xl font-bold text-slate-950">
                {
                  result.result
                    .hardViolations
                }
              </div>
              </div>

              <div className="rounded-2xl bg-white p-4">
              <div className="text-xs text-slate-400">
                الحصص
              </div>

              <div className="mt-1 text-xl font-bold text-slate-950">
                {
                  result.result
                    .sessions
                }
              </div>
              </div>

              <div className="rounded-2xl bg-white p-4">
              <div className="text-xs text-slate-400">
                الزمن
              </div>

              <div className="mt-1 text-xl font-bold text-slate-950">
                {
                  formatDuration(
                    result.result
                      .durationMs,
                  )
                }
              </div>
              </div>
            </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">لا توجد نسخة محفوظة بعد.</p>
        )}
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-slate-950">النسخ المحفوظة</h2>
          <span className="text-xs text-slate-400">{versions.length}</span>
        </div>

        {versions.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-100">
            {versions.map((version) => (
              <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    النسخة {version.version}
                    {version.isCurrent ? <span className="mr-2 text-xs text-[#3478B8]">الحالية</span> : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {timetableV3StatusLabel(version.status)} · {version.sessions} حصة · {dateFormatter.format(new Date(version.generatedAt))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/timetable-v3/${projectId}/preview?${new URLSearchParams({ scheduleId: version.id }).toString()}`)}
                  className="h-9 rounded-xl border border-[#C9DFEC] bg-white px-4 text-xs font-bold text-[#3478B8] transition hover:bg-[#F4FAFD]"
                >
                  معاينة
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">لا توجد نسخ محفوظة بعد.</p>
        )}
      </section>

      <div className="mt-8 flex items-center justify-end gap-3">
        {availableSchedule ? (
          <button
            type="button"
            onClick={
              () =>
                router.push(
                  `/dashboard/timetable-v3/${projectId}/preview?${new URLSearchParams({ scheduleId: availableSchedule.id }).toString()}`,
                )
            }
            className="h-11 rounded-xl bg-[#3478B8] px-5 text-sm font-bold text-white transition hover:bg-[#2D6BA5]"
          >
            متابعة إلى المعاينة
          </button>
        ) : null}
      </div>
    </main>
  );
}
