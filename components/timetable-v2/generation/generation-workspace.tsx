"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Day = {
  id: string;
  label: string;
  order: number;
};

type Period = {
  id: string;
  label: string;
  order: number;
};

type ClassItem = {
  id: string;
  name: string;
};

type Entry = {
  id: string;

  assignmentId:
    string | null;

  teacherId: string;
  teacherName: string;

  classId: string;
  className: string;

  subjectId: string;
  subjectName: string;

  dayId: string;
  dayLabel: string;

  periodId: string;
  periodLabel: string;
  periodOrder: number;

  isLocked: boolean;
  source: string;

  placementScore: number;
};

type Version = {
  id: string;
  version: number;
  status: string;
  isCurrent: boolean;

  score: number;
  completeness: number;

  hardViolations: number;
  softPenalty: number;

  attemptCount: number;
  seed: number;
  durationMs: number;

  engineVersion: string;
  dataFingerprint: string;

  generatedAt: string;

  _count: {
    entries: number;
  };
};

type CurrentSchedule = {
  id: string;
  version: number;
  status: string;
  isCurrent: boolean;

  score: number;
  completeness: number;

  hardViolations: number;
  softPenalty: number;

  attemptCount: number;
  seed: number;
  durationMs: number;

  engineVersion: string;
  dataFingerprint: string;

  generatedAt: string;

  entries: Entry[];
};

type Props = {
  workspace: {
    project: {
      id: string;
      name: string;
      academicYear: string;
      semester: string;
      status: string;
    };

    days: Day[];
    periods: Period[];
    classes: ClassItem[];

    versions: Version[];

    current:
      CurrentSchedule | null;

    currentIsStale:
      boolean;
  };
};

type Message = {
  tone:
    | "success"
    | "error"
    | "info";

  text: string;
};

function statusLabel(
  status: string,
) {
  const labels:
    Record<
      string,
      string
    > = {
      GENERATED:
        "مولدة",

      APPROVED:
        "معتمدة",

      PUBLISHED:
        "منشورة",

      ARCHIVED:
        "مؤرشفة",
    };

  return (
    labels[status] ??
    status
  );
}

function formatDuration(
  value: number,
) {
  if (
    value < 1000
  ) {
    return `${value} ms`;
  }

  return `${(
    value / 1000
  ).toFixed(1)} ث`;
}

export function TimetableV2GenerationWorkspace({
  workspace,
}: Props) {
  const router =
    useRouter();

  const [
    pending,
    startTransition,
  ] =
    useTransition();

  const [
    attempts,
    setAttempts,
  ] =
    useState(24);

  const [
    seed,
    setSeed,
  ] =
    useState("");

  const [
    selectedClassId,
    setSelectedClassId,
  ] =
    useState(
      workspace.classes[0]
        ?.id ?? "",
    );

  const [
    message,
    setMessage,
  ] =
    useState<Message | null>(
      null,
    );

  const current =
    workspace.current;

  const selectedEntries =
    useMemo(
      () =>
        current?.entries.filter(
          (entry) =>
            entry.classId ===
            selectedClassId,
        ) ?? [],
      [
        current,
        selectedClassId,
      ],
    );

  const cellMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          Entry
        >();

      for (
        const entry of
        selectedEntries
      ) {
        map.set(
          `${entry.dayId}:${entry.periodId}`,
          entry,
        );
      }

      return map;
    }, [
      selectedEntries,
    ]);

  async function generate() {
    setMessage(null);

    const body:
      Record<
        string,
        number
      > = {
      attempts,
    };

    const parsedSeed =
      Number(seed);

    if (
      seed.trim() &&
      Number.isInteger(
        parsedSeed,
      ) &&
      parsedSeed > 0
    ) {
      body.seed =
        parsedSeed;
    }

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              `/api/dashboard/principal/timetable-v2/projects/${workspace.project.id}/generate`,
              {
                method:
                  "POST",

                headers: {
                  "content-type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    body,
                  ),
              },
            );

          const data =
            await response
              .json()
              .catch(
                () => null,
              );

          if (
            !response.ok ||
            !data?.success
          ) {
            const best =
              data?.result
                ?.best;

            if (best) {
              throw new Error(
                `${data.error} أفضل محاولة: ${best.scheduledSessions}/${best.requiredSessions} حصة.`,
              );
            }

            throw new Error(
              data?.error ??
                "تعذر إنشاء الجدول.",
            );
          }

          setMessage({
            tone:
              "success",

            text:
              `تم إنشاء نسخة جديدة بنجاح: ${data.result.sessions} حصة، الجودة ${data.result.score}%، خلال ${formatDuration(data.result.durationMs)}.`,
          });

          router.refresh();
        }
        catch (error) {
          setMessage({
            tone:
              "error",

            text:
              error instanceof Error
                ? error.message
                : "تعذر إنشاء الجدول.",
          });
        }
      },
    );
  }

  function runAction(
    action:
      | "ACTIVATE"
      | "APPROVE"
      | "PUBLISH",

    scheduleId:
      string,
  ) {
    setMessage(null);

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              `/api/dashboard/principal/timetable-v2/projects/${workspace.project.id}/generate`,
              {
                method:
                  "PATCH",

                headers: {
                  "content-type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    action,
                    scheduleId,
                  }),
              },
            );

          const data =
            await response
              .json()
              .catch(
                () => null,
              );

          if (
            !response.ok ||
            !data?.success
          ) {
            throw new Error(
              data?.error ??
                "تعذر تنفيذ العملية.",
            );
          }

          setMessage({
            tone:
              "success",

            text:
              action ===
                "ACTIVATE"
                ? "تم جعل النسخة هي النسخة الحالية."
                : action ===
                    "APPROVE"
                  ? "تم اعتماد نسخة الجدول."
                  : "تم نشر نسخة الجدول.",
          });

          router.refresh();
        }
        catch (error) {
          setMessage({
            tone:
              "error",

            text:
              error instanceof Error
                ? error.message
                : "تعذر تنفيذ العملية.",
          });
        }
      },
    );
  }

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-[1600px] space-y-5 pb-20"
    >
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-l from-sky-50 via-white to-teal-50 p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-black text-teal-700">
              الخطوة 6
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              إنشاء الجدول
            </h1>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              {
                workspace.project.name
              }
              {" • "}
              {
                workspace.project.academicYear
              }
              {" • "}
              {
                workspace.project.semester
              }
            </p>

            <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500">
              يشغل المحرك عدة محاولات، يرفض أي تعارض إلزامي، ثم يحتفظ بأفضل نتيجة حسب القيود والتفضيلات والتوازن.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/timetable-v2/${workspace.project.id}/readiness`}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
            >
              فحص الجاهزية
            </Link>

            <Link
              href={`/dashboard/timetable-v2/${workspace.project.id}`}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
            >
              العودة للمشروع
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="النسخ"
            value={
              workspace.versions
                .length
            }
          />

          <Metric
            label="النسخة الحالية"
            value={
              current
                ? `#${current.version}`
                : "—"
            }
          />

          <Metric
            label="الجودة"
            value={
              current
                ? `${current.score}%`
                : "—"
            }
          />

          <Metric
            label="الحصص"
            value={
              current
                ? current.entries
                    .length
                : 0
            }
          />

          <Metric
            label="الحالة"
            value={
              current
                ? statusLabel(
                    current.status,
                  )
                : "لم يُنشأ"
            }
          />
        </div>
      </section>

      {workspace.currentIsStale ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="font-black text-amber-900">
            النسخة الحالية أصبحت قديمة
          </div>

          <p className="mt-1 text-xs leading-6 text-amber-700">
            تم تعديل الإسنادات أو القيود أو أوقات المشروع بعد إنشاء هذه النسخة. يمكنك الاحتفاظ بها للمقارنة، لكن يفضل إنشاء نسخة جديدة.
          </p>
        </section>
      ) : null}

      {message ? (
        <section
          className={[
            "rounded-2xl border px-5 py-4 text-sm font-bold",
            message.tone ===
            "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : message.tone ===
                  "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-sky-200 bg-sky-50 text-sky-800",
          ].join(" ")}
        >
          {message.text}
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              تشغيل المحرك
            </h2>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              كل تشغيل ينشئ نسخة جديدة؛ لن نخسر النسخ السابقة.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-[180px_220px_1fr] xl:w-auto">
            <label>
              <span className="text-xs font-black text-slate-500">
                عدد المحاولات
              </span>

              <input
                type="number"
                min={1}
                max={60}
                value={
                  attempts
                }
                onChange={(event) =>
                  setAttempts(
                    Math.max(
                      1,
                      Math.min(
                        60,
                        Number(
                          event.target.value,
                        ) || 1,
                      ),
                    ),
                  )
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-black"
              />
            </label>

            <label>
              <span className="text-xs font-black text-slate-500">
                Seed اختياري
              </span>

              <input
                type="number"
                min={1}
                value={
                  seed
                }
                onChange={(event) =>
                  setSeed(
                    event.target.value,
                  )
                }
                placeholder="عشوائي"
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3"
              />
            </label>

            <button
              type="button"
              disabled={
                pending
              }
              onClick={
                generate
              }
              className="mt-auto h-12 rounded-xl bg-slate-950 px-7 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending
                ? "المحرك يعمل..."
                : current
                  ? "إنشاء نسخة جديدة"
                  : "إنشاء الجدول"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <InfoCard
            title="القيود الإلزامية"
            text="لا يتم تجاوزها أبدًا."
          />

          <InfoCard
            title="التفضيلات"
            text="تدخل في تقييم جودة الحل."
          />

          <InfoCard
            title="الإسناد المشترك"
            text="لكل معلم عدد حصصه المحدد فقط."
          />

          <InfoCard
            title="أفضل محاولة"
            text="يتم حفظ الأفضل من جميع المحاولات."
          />
        </div>
      </section>

      {current ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-slate-950">
                  معاينة النسخة الحالية
                </h2>

                <span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-black text-teal-700">
                  نسخة #{current.version}
                </span>

                {current.status ===
                "PUBLISHED" ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                    منشورة
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                اختر فصلًا لعرض جدوله الأسبوعي.
              </p>
            </div>

            <select
              value={
                selectedClassId
              }
              onChange={(event) =>
                setSelectedClassId(
                  event.target.value,
                )
              }
              className="h-11 min-w-56 rounded-xl border border-slate-200 bg-white px-3 font-black"
            >
              {workspace.classes.map(
                (item) => (
                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {item.name}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="mt-5 overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-[900px] w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky right-0 z-10 border-b border-l border-slate-200 bg-slate-950 px-4 py-3 text-right text-xs text-white">
                    الحصة
                  </th>

                  {workspace.days.map(
                    (day) => (
                      <th
                        key={
                          day.id
                        }
                        className="border-b border-l border-slate-200 bg-slate-950 px-4 py-3 text-center text-xs font-black text-white"
                      >
                        {
                          day.label
                        }
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {workspace.periods.map(
                  (period) => (
                    <tr
                      key={
                        period.id
                      }
                    >
                      <td className="sticky right-0 border-b border-l border-slate-200 bg-white px-4 py-4">
                        <div className="font-black text-slate-900">
                          {
                            period.label
                          }
                        </div>
                      </td>

                      {workspace.days.map(
                        (day) => {
                          const entry =
                            cellMap.get(
                              `${day.id}:${period.id}`,
                            );

                          return (
                            <td
                              key={
                                day.id
                              }
                              className="border-b border-l border-slate-100 p-2 align-top"
                            >
                              {entry ? (
                                <div
                                  className={[
                                    "min-h-24 rounded-xl border p-3",
                                    entry.isLocked
                                      ? "border-violet-200 bg-violet-50"
                                      : "border-teal-200 bg-teal-50",
                                  ].join(" ")}
                                >
                                  <div className="font-black text-slate-950">
                                    {
                                      entry.subjectName
                                    }
                                  </div>

                                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                                    {
                                      entry.teacherName
                                    }
                                  </div>

                                  {entry.isLocked ? (
                                    <div className="mt-2 inline-flex rounded-full bg-violet-100 px-2 py-1 text-[9px] font-black text-violet-700">
                                      مثبت
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-bold text-slate-400">
                                  فارغ
                                </div>
                              )}
                            </td>
                          );
                        },
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-xl font-black text-slate-900">
            لم يتم إنشاء جدول بعد
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            شغّل المحرك بعد اكتمال فحص الجاهزية.
          </p>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            نسخ الجدول
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            يمكنك الرجوع لأي نسخة سابقة أو اعتماد أفضل نسخة ثم نشرها.
          </p>
        </div>

        {workspace.versions.length ===
        0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            لا توجد نسخ حتى الآن.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {workspace.versions.map(
              (version) => (
                <article
                  key={
                    version.id
                  }
                  className={[
                    "rounded-2xl border p-4",
                    version.isCurrent
                      ? "border-teal-300 bg-teal-50/50"
                      : "border-slate-200 bg-slate-50",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black text-slate-950">
                          نسخة #{version.version}
                        </div>

                        {version.isCurrent ? (
                          <span className="rounded-full bg-teal-100 px-2 py-1 text-[9px] font-black text-teal-700">
                            الحالية
                          </span>
                        ) : null}

                        <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-slate-600">
                          {
                            statusLabel(
                              version.status,
                            )
                          }
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        {version._count.entries} حصة
                        {" • "}
                        {version.attemptCount} محاولة
                        {" • "}
                        {formatDuration(
                          version.durationMs,
                        )}
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-2xl font-black text-teal-700">
                        {version.score}%
                      </div>

                      <div className="text-[10px] text-slate-400">
                        جودة
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <MiniMetric
                      label="الاكتمال"
                      value={`${version.completeness}%`}
                    />

                    <MiniMetric
                      label="Hard"
                      value={
                        version.hardViolations
                      }
                    />

                    <MiniMetric
                      label="Penalty"
                      value={
                        version.softPenalty
                      }
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!version.isCurrent ? (
                      <button
                        type="button"
                        disabled={
                          pending
                        }
                        onClick={() =>
                          runAction(
                            "ACTIVATE",
                            version.id,
                          )
                        }
                        className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-black text-teal-700"
                      >
                        جعلها الحالية
                      </button>
                    ) : null}

                    {version.status ===
                    "GENERATED" ? (
                      <button
                        type="button"
                        disabled={
                          pending
                        }
                        onClick={() =>
                          runAction(
                            "APPROVE",
                            version.id,
                          )
                        }
                        className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-700"
                      >
                        اعتماد
                      </button>
                    ) : null}

                    {version.status ===
                    "APPROVED" ? (
                      <button
                        type="button"
                        disabled={
                          pending
                        }
                        onClick={() =>
                          runAction(
                            "PUBLISH",
                            version.id,
                          )
                        }
                        className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
                      >
                        نشر الجدول
                      </button>
                    ) : null}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value:
    string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="text-xs font-bold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value:
    string | number;
}) {
  return (
    <div className="rounded-xl bg-white p-3 text-center">
      <div className="text-[9px] font-bold text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-black text-slate-900">
        {value}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-black text-slate-900">
        {title}
      </div>

      <div className="mt-1 text-xs leading-5 text-slate-500">
        {text}
      </div>
    </div>
  );
}