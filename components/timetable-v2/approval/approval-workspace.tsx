"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Workspace = {
  project: {
    id: string;
    name: string;
    status: string;

    days: Array<{
      id: string;
      label: string;
      order: number;
    }>;

    periods: Array<{
      id: string;
      label: string;
      order: number;
      isBreak: boolean;
    }>;
  };

  schedule: {
    id: string;
    version: number;
    status: string;
    score: number;
    completeness: number;
    hardViolations: number;
    softPenalty: number;
    engineVersion: string;
  };

  versions: Array<{
    id: string;
    version: number;
    status: string;
    isCurrent: boolean;
    score: number;
    generatedAt: string;
  }>;

  classes: Array<{
    id: string;
    name: string;
  }>;

  entries: Array<{
    id: string;
    classId: string;
  }>;
};

type Props = {
  projectId: string;
};

type ApprovalAction =
  | "APPROVE"
  | "PUBLISH";

function statusLabel(
  value: string,
) {
  switch (
    value
  ) {
    case "GENERATED":
      return "مولدة";

    case "APPROVED":
      return "معتمدة";

    case "PUBLISHED":
      return "منشورة";

    case "ARCHIVED":
      return "مؤرشفة";

    default:
      return value;
  }
}

function statusClass(
  value: string,
) {
  switch (
    value
  ) {
    case "PUBLISHED":
      return "bg-emerald-100 text-emerald-700";

    case "APPROVED":
      return "bg-cyan-100 text-cyan-700";

    case "ARCHIVED":
      return "bg-slate-100 text-slate-500";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

export function TimetableV2ApprovalWorkspace({
  projectId,
}: Props) {
  const router =
    useRouter();

  const [
    workspace,
    setWorkspace,
  ] =
    useState<
      Workspace | null
    >(
      null,
    );

  const [
    selectedScheduleId,
    setSelectedScheduleId,
  ] =
    useState(
      "",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    working,
    setWorking,
  ] =
    useState(
      false,
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    confirmation,
    setConfirmation,
  ] =
    useState<{
      action:
        ApprovalAction;

      title:
        string;

      description:
        string;
    } | null>(
      null,
    );

  async function load(
    scheduleId?: string,
  ) {
    setLoading(
      true,
    );

    setError(
      null,
    );

    try {
      const query =
        scheduleId
          ? `?scheduleId=${encodeURIComponent(scheduleId)}`
          : "";

      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v2/projects/${projectId}/review${query}`,
          {
            cache:
              "no-store",
          },
        );

      const payload =
        await response.json();

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
          "تعذر تحميل مرحلة الاعتماد.",
        );
      }

      const next =
        payload.workspace as
          Workspace;

      setWorkspace(
        next,
      );

      setSelectedScheduleId(
        next.schedule.id,
      );
    }
    catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "تعذر تحميل مرحلة الاعتماد.",
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
    [
      projectId,
    ],
  );

  const currentVersion =
    useMemo(
      () =>
        workspace
          ?.versions.find(
            (version) =>
              version.id ===
              selectedScheduleId,
          ) ??
        null,
      [
        workspace,
        selectedScheduleId,
      ],
    );

  const canApprove =
    workspace !==
      null &&
    workspace.schedule.completeness ===
      100 &&
    workspace.schedule.hardViolations ===
      0 &&
    workspace.schedule.status !==
      "PUBLISHED";

  const canPublish =
    workspace !==
      null &&
    (
      workspace.schedule.status ===
        "APPROVED" ||
      workspace.schedule.status ===
        "PUBLISHED"
    ) &&
    workspace.schedule.completeness ===
      100 &&
    workspace.schedule.hardViolations ===
      0;

  async function chooseVersion(
    scheduleId: string,
  ) {
    setSelectedScheduleId(
      scheduleId,
    );

    await load(
      scheduleId,
    );
  }

  function requestApprove() {
    if (
      !workspace ||
      !canApprove
    ) {
      return;
    }

    setConfirmation({
      action:
        "APPROVE",

      title:
        `اعتماد النسخة #${workspace.schedule.version}`,

      description:
        "سيتم إجراء فحص جديد على بيانات المشروع والقيود والجدول المحفوظ قبل الاعتماد. الاعتماد لا ينشر الجدول للتشغيل اليومي.",
    });
  }

  function requestPublish() {
    if (
      !workspace ||
      !canPublish
    ) {
      return;
    }

    setConfirmation({
      action:
        "PUBLISH",

      title:
        `نشر النسخة #${workspace.schedule.version}`,

      description:
        "بعد النشر ستصبح هذه النسخة الجدول التشغيلي الرسمي، وستستخدمها عمليات الغياب والانتظار والبدائل. النسخة المنشورة السابقة ستبقى محفوظة كمؤرشفة.",
    });
  }

  async function executeAction() {
    if (
      !workspace ||
      !confirmation
    ) {
      return;
    }

    const action =
      confirmation.action;

    setWorking(
      true,
    );

    setMessage(
      null,
    );

    setError(
      null,
    );

    try {
      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v2/projects/${projectId}/approval`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action,

                scheduleId:
                  workspace.schedule.id,
              }),
          },
        );

      const payload =
        await response.json();

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
          "تعذر تنفيذ العملية.",
        );
      }

      setConfirmation(
        null,
      );

      setMessage(
        payload.message ??
        (
          action ===
            "APPROVE"
            ? "تم اعتماد النسخة."
            : "تم نشر النسخة."
        ),
      );

      await load(
        workspace.schedule.id,
      );

      router.refresh();
    }
    catch (caught) {
      setConfirmation(
        null,
      );

      setError(
        caught instanceof Error
          ? caught.message
          : "تعذر تنفيذ العملية.",
      );
    }
    finally {
      setWorking(
        false,
      );
    }
  }

  if (
    loading &&
    !workspace
  ) {
    return (
      <div
        className="
          rounded-[30px]
          border border-slate-200
          bg-white
          p-10
          text-center
          text-sm font-bold
          text-slate-500
        "
      >
        جارٍ تحميل مرحلة الاعتماد والنشر...
      </div>
    );
  }

  if (
    !workspace
  ) {
    return (
      <div
        className="
          rounded-[30px]
          border border-rose-200
          bg-rose-50
          p-10
          text-center
          text-sm font-black
          text-rose-700
        "
      >
        {error ??
          "تعذر تحميل النسخة."}
      </div>
    );
  }

  const manualReview =
    workspace.schedule.engineVersion.includes(
      "+manual-review",
    );

  return (
    <div
      dir="rtl"
      className="space-y-5"
    >
      <section
        className="
          rounded-[32px]
          border border-slate-200
          bg-gradient-to-l
          from-emerald-50
          via-cyan-50/50
          to-white
          p-6
          shadow-sm
        "
      >
        <div
          className="
            flex flex-wrap
            items-start
            justify-between
            gap-5
          "
        >
          <div>
            <div
              className="
                inline-flex
                rounded-full
                bg-emerald-100
                px-3 py-1
                text-xs font-black
                text-emerald-700
              "
            >
              الخطوة 10
            </div>

            <h1
              className="
                mt-3
                text-3xl
                font-black
                text-slate-950
              "
            >
              الاعتماد والنشر
            </h1>

            <p
              className="
                mt-2
                max-w-3xl
                text-sm
                leading-7
                text-slate-500
              "
            >
              الاعتماد يثبت النسخة المختارة بعد فحصها،
              أما النشر فهو الذي يحولها إلى الجدول التشغيلي
              الرسمي للمدرسة.
            </p>
          </div>

          <div
            className="
              flex flex-wrap
              gap-2
            "
          >
            <Link
              href={
                `/dashboard/timetable-v2/${projectId}/review`
              }
              className="
                rounded-2xl
                border border-slate-200
                bg-white
                px-4 py-2.5
                text-sm font-black
                text-slate-700
              "
            >
              العودة للمراجعة
            </Link>

            <Link
              href={
                `/dashboard/timetable-v2/${projectId}/generate`
              }
              className="
                rounded-2xl
                border border-slate-200
                bg-white
                px-4 py-2.5
                text-sm font-black
                text-slate-700
              "
            >
              إنشاء نسخة أخرى
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <div
          className="
            rounded-2xl
            border border-emerald-200
            bg-emerald-50
            px-5 py-4
            text-sm font-black
            text-emerald-700
          "
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          className="
            rounded-2xl
            border border-rose-200
            bg-rose-50
            px-5 py-4
            text-sm font-black
            text-rose-700
          "
        >
          {error}
        </div>
      ) : null}

      <section
        className="
          rounded-[30px]
          border border-slate-200
          bg-white
          p-6
          shadow-sm
        "
      >
        <div
          className="
            flex flex-wrap
            items-center
            justify-between
            gap-4
          "
        >
          <div>
            <div
              className="
                text-xs font-bold
                text-slate-400
              "
            >
              النسخة المراد التعامل معها
            </div>

            <div
              className="
                mt-1
                flex flex-wrap
                items-center
                gap-2
              "
            >
              <span
                className="
                  text-2xl font-black
                  text-slate-950
                "
              >
                نسخة #{workspace.schedule.version}
              </span>

              <span
                className={`
                  rounded-full
                  px-3 py-1
                  text-xs font-black
                  ${statusClass(
                    workspace.schedule.status,
                  )}
                `}
              >
                {statusLabel(
                  workspace.schedule.status,
                )}
              </span>

              {currentVersion?.isCurrent ? (
                <span
                  className="
                    rounded-full
                    bg-violet-100
                    px-3 py-1
                    text-xs font-black
                    text-violet-700
                  "
                >
                  الحالية
                </span>
              ) : null}
            </div>
          </div>

          <select
            value={
              selectedScheduleId
            }
            onChange={
              (
                event,
              ) =>
                void chooseVersion(
                  event.target.value,
                )
            }
            className="
              min-w-[230px]
              rounded-2xl
              border border-slate-200
              bg-white
              px-4 py-3
              text-sm font-black
              text-slate-800
            "
          >
            {workspace.versions.map(
              (
                version,
              ) => (
                <option
                  key={
                    version.id
                  }
                  value={
                    version.id
                  }
                >
                  نسخة #{version.version}
                  {" — "}
                  {statusLabel(
                    version.status,
                  )}
                  {version.isCurrent
                    ? " — الحالية"
                    : ""}
                </option>
              ),
            )}
          </select>
        </div>

        <div
          className="
            mt-6 grid
            gap-3
            sm:grid-cols-2
            lg:grid-cols-5
          "
        >
          <Metric
            label="الاكتمال"
            value={`${workspace.schedule.completeness}%`}
            good={
              workspace.schedule.completeness ===
              100
            }
          />

          <Metric
            label="Hard"
            value={
              String(
                workspace.schedule.hardViolations,
              )
            }
            good={
              workspace.schedule.hardViolations ===
              0
            }
          />

          <Metric
            label="الحصص"
            value={
              String(
                workspace.entries.length,
              )
            }
            good
          />

          <Metric
            label="Penalty"
            value={
              manualReview
                ? "مراجعة يدوية"
                : String(
                    workspace.schedule.softPenalty,
                  )
            }
          />

          <Metric
            label="الجودة"
            value={
              manualReview
                ? "يدوية"
                : `${workspace.schedule.score}%`
            }
            good={
              !manualReview &&
              workspace.schedule.score >=
                90
            }
          />
        </div>

        {manualReview ? (
          <div
            className="
              mt-4
              rounded-2xl
              border border-amber-200
              bg-amber-50
              px-4 py-3
              text-xs font-bold
              leading-6
              text-amber-700
            "
          >
            هذه النسخة تحتوي تعديلات يدوية.
            لذلك لا نعرض جودة التوليد الأصلية كأنها تقييم
            جديد للتعديلات؛ الاعتماد يعتمد على الفحص الإلزامي
            الفعلي للجدول.
          </div>
        ) : null}
      </section>

      <section
        className="
          grid gap-4
          lg:grid-cols-2
        "
      >
        <div
          className="
            rounded-[28px]
            border border-cyan-200
            bg-cyan-50/60
            p-6
          "
        >
          <div
            className="
              text-lg font-black
              text-slate-950
            "
          >
            1. اعتماد النسخة
          </div>

          <p
            className="
              mt-2
              text-sm leading-7
              text-slate-600
            "
          >
            قبل الاعتماد يتم فحص حداثة النسخة،
            الاكتمال، القيود الإلزامية، ثم إعادة
            التحقق من Entries المحفوظة نفسها.
          </p>

          <button
            type="button"
            onClick={
              requestApprove
            }
            disabled={
              !canApprove ||
              working
            }
            className="
              mt-5
              w-full
              rounded-2xl
              bg-cyan-700
              px-5 py-3
              text-sm font-black
              text-white
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {workspace.schedule.status ===
              "APPROVED"
              ? "النسخة معتمدة"
              : "اعتماد النسخة"}
          </button>
        </div>

        <div
          className="
            rounded-[28px]
            border border-emerald-200
            bg-emerald-50/60
            p-6
          "
        >
          <div
            className="
              text-lg font-black
              text-slate-950
            "
          >
            2. نشر الجدول
          </div>

          <p
            className="
              mt-2
              text-sm leading-7
              text-slate-600
            "
          >
            النشر هو الخطوة التشغيلية.
            عندها فقط تتم مزامنة الجدول مع الغياب
            والانتظار والبدائل، وتؤرشف النسخة المنشورة
            السابقة.
          </p>

          <button
            type="button"
            onClick={
              requestPublish
            }
            disabled={
              !canPublish ||
              working ||
              workspace.schedule.status ===
                "PUBLISHED"
            }
            className="
              mt-5
              w-full
              rounded-2xl
              bg-emerald-700
              px-5 py-3
              text-sm font-black
              text-white
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {workspace.schedule.status ===
              "PUBLISHED"
              ? "النسخة منشورة"
              : "نشر كجدول رسمي"}
          </button>
        </div>
      </section>

      <section
        className="
          rounded-[28px]
          border border-slate-200
          bg-white
          p-6
          shadow-sm
        "
      >
        <h2
          className="
            text-lg font-black
            text-slate-950
          "
        >
          سجل النسخ
        </h2>

        <div
          className="
            mt-4
            overflow-x-auto
          "
        >
          <table
            className="
              w-full
              min-w-[700px]
              text-sm
            "
          >
            <thead>
              <tr
                className="
                  border-b
                  border-slate-200
                  text-right
                  text-xs font-black
                  text-slate-400
                "
              >
                <th className="px-3 py-3">
                  النسخة
                </th>

                <th className="px-3 py-3">
                  الحالة
                </th>

                <th className="px-3 py-3">
                  الجودة
                </th>

                <th className="px-3 py-3">
                  الحالية
                </th>

                <th className="px-3 py-3">
                  إجراء
                </th>
              </tr>
            </thead>

            <tbody>
              {workspace.versions.map(
                (
                  version,
                ) => (
                  <tr
                    key={
                      version.id
                    }
                    className="
                      border-b
                      border-slate-100
                    "
                  >
                    <td
                      className="
                        px-3 py-4
                        font-black
                        text-slate-900
                      "
                    >
                      #{version.version}
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={`
                          rounded-full
                          px-2.5 py-1
                          text-xs font-black
                          ${statusClass(
                            version.status,
                          )}
                        `}
                      >
                        {statusLabel(
                          version.status,
                        )}
                      </span>
                    </td>

                    <td
                      className="
                        px-3 py-4
                        font-bold
                        text-slate-600
                      "
                    >
                      {version.score}%
                    </td>

                    <td className="px-3 py-4">
                      {version.isCurrent
                        ? "نعم"
                        : "—"}
                    </td>

                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={
                          () =>
                            void chooseVersion(
                              version.id,
                            )
                        }
                        className="
                          rounded-xl
                          border border-slate-200
                          bg-white
                          px-3 py-2
                          text-xs font-black
                          text-slate-700
                        "
                      >
                        فتح
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {confirmation ? (
        <div
          className="
            fixed inset-0
            z-[100]
            flex items-center
            justify-center
            bg-slate-950/35
            p-4
            backdrop-blur-sm
          "
        >
          <div
            role="dialog"
            aria-modal="true"
            className="
              w-full
              max-w-lg
              rounded-[30px]
              border border-slate-200
              bg-white
              p-6
              shadow-2xl
            "
          >
            <div
              className="
                text-xl font-black
                text-slate-950
              "
            >
              {confirmation.title}
            </div>

            <p
              className="
                mt-3
                text-sm
                leading-7
                text-slate-600
              "
            >
              {confirmation.description}
            </p>

            <div
              className="
                mt-6
                flex flex-wrap
                justify-end
                gap-2
              "
            >
              <button
                type="button"
                disabled={
                  working
                }
                onClick={
                  () =>
                    setConfirmation(
                      null,
                    )
                }
                className="
                  rounded-2xl
                  border border-slate-200
                  bg-white
                  px-4 py-2.5
                  text-sm font-black
                  text-slate-700
                  disabled:opacity-50
                "
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={
                  working
                }
                onClick={
                  () =>
                    void executeAction()
                }
                className={`
                  rounded-2xl
                  px-5 py-2.5
                  text-sm font-black
                  text-white
                  disabled:opacity-50
                  ${
                    confirmation.action ===
                    "PUBLISH"
                      ? "bg-emerald-700"
                      : "bg-cyan-700"
                  }
                `}
              >
                {working
                  ? "جارٍ التحقق..."
                  : confirmation.action ===
                      "PUBLISH"
                    ? "تأكيد النشر"
                    : "تأكيد الاعتماد"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  good = false,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div
      className="
        rounded-2xl
        border border-slate-200
        bg-slate-50
        px-4 py-4
      "
    >
      <div
        className="
          text-[11px]
          font-bold
          text-slate-400
        "
      >
        {label}
      </div>

      <div
        className={`
          mt-1
          text-xl font-black
          ${
            good
              ? "text-emerald-700"
              : "text-slate-950"
          }
        `}
      >
        {value}
      </div>
    </div>
  );
}