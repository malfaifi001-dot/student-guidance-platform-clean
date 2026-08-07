"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Entry = {
  id: string;
  assignmentId: string | null;

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

  entries: Entry[];
};

type Edit =
  | {
      type: "MOVE";
      entryId: string;
      dayId: string;
      periodId: string;
    }
  | {
      type: "SWAP";
      firstEntryId: string;
      secondEntryId: string;
    }
  | {
      type: "LOCK";
      entryId: string;
      isLocked: boolean;
    };

type Props = {
  projectId: string;
};

function slotKey(
  dayId: string,
  periodId: string,
) {
  return `${dayId}:${periodId}`;
}

export function TimetableV2ReviewWorkspace({
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
    entries,
    setEntries,
  ] =
    useState<Entry[]>(
      [],
    );

  const [
    edits,
    setEdits,
  ] =
    useState<Edit[]>(
      [],
    );

  const [
    selectedClassId,
    setSelectedClassId,
  ] =
    useState(
      "",
    );

  const [
    selectedEntryId,
    setSelectedEntryId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    swapEntryId,
    setSwapEntryId,
  ] =
    useState<
      string | null
    >(
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
    saving,
    setSaving,
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
    undoStack,
    setUndoStack,
  ] =
    useState<
      Array<{
        entries: Entry[];
        edits: Edit[];
      }>
    >(
      [],
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
          "تعذر تحميل المراجعة.",
        );
      }

      const next =
        payload.workspace as Workspace;

      setWorkspace(
        next,
      );

      setEntries(
        next.entries,
      );

      setEdits(
        [],
      );

      setUndoStack(
        [],
      );

      setSelectedEntryId(
        null,
      );

      setSwapEntryId(
        null,
      );

      setSelectedClassId(
        (
          current,
        ) =>
          current &&
          next.classes.some(
            (item) =>
              item.id ===
              current,
          )
            ? current
            : next.classes[0]?.id ??
              "",
      );
    }
    catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "تعذر تحميل المراجعة.",
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

  const selectedEntry =
    useMemo(
      () =>
        entries.find(
          (entry) =>
            entry.id ===
            selectedEntryId,
        ) ??
        null,
      [
        entries,
        selectedEntryId,
      ],
    );

  const classEntries =
    useMemo(
      () =>
        entries.filter(
          (entry) =>
            entry.classId ===
            selectedClassId,
        ),
      [
        entries,
        selectedClassId,
      ],
    );

  const bySlot =
    useMemo(
      () =>
        new Map(
          classEntries.map(
            (entry) => [
              slotKey(
                entry.dayId,
                entry.periodId,
              ),
              entry,
            ],
          ),
        ),
      [
        classEntries,
      ],
    );

  function pushUndo() {
    setUndoStack(
      (
        current,
      ) => [
        ...current,
        {
          entries:
            entries.map(
              (entry) => ({
                ...entry,
              }),
            ),

          edits:
            edits.map(
              (edit) => ({
                ...edit,
              }),
            ),
        },
      ],
    );
  }

  function moveSelected(
    dayId: string,
    periodId: string,
  ) {
    if (
      !selectedEntry
    ) {
      setMessage(
        "اختر الحصة التي تريد نقلها أولًا.",
      );

      return;
    }

    if (
      selectedEntry.isLocked
    ) {
      setMessage(
        "الحصة مقفلة. افتح القفل أولًا.",
      );

      return;
    }

    const occupied =
      bySlot.get(
        slotKey(
          dayId,
          periodId,
        ),
      );

    if (
      occupied &&
      occupied.id !==
        selectedEntry.id
    ) {
      setMessage(
        "الخلية مشغولة. استخدم التبديل بدل النقل.",
      );

      return;
    }

    const day =
      workspace?.project.days.find(
        (item) =>
          item.id ===
          dayId,
      );

    const period =
      workspace?.project.periods.find(
        (item) =>
          item.id ===
          periodId,
      );

    if (
      !day ||
      !period ||
      period.isBreak
    ) {
      return;
    }

    pushUndo();

    setEntries(
      (
        current,
      ) =>
        current.map(
          (entry) =>
            entry.id ===
            selectedEntry.id
              ? {
                  ...entry,

                  dayId:
                    day.id,

                  dayLabel:
                    day.label,

                  periodId:
                    period.id,

                  periodLabel:
                    period.label,

                  periodOrder:
                    period.order,

                  source:
                    "MANUAL_MOVE",
                }
              : entry,
        ),
    );

    setEdits(
      (
        current,
      ) => [
        ...current,
        {
          type:
            "MOVE",

          entryId:
            selectedEntry.id,

          dayId:
            day.id,

          periodId:
            period.id,
        },
      ],
    );

    setMessage(
      "تم النقل محليًا. احفظ التعديلات لإنشاء نسخة جديدة.",
    );
  }

  function toggleLock(
    entry: Entry,
  ) {
    pushUndo();

    const nextValue =
      !entry.isLocked;

    setEntries(
      (
        current,
      ) =>
        current.map(
          (item) =>
            item.id ===
            entry.id
              ? {
                  ...item,
                  isLocked:
                    nextValue,
                }
              : item,
        ),
    );

    setEdits(
      (
        current,
      ) => [
        ...current,
        {
          type:
            "LOCK",

          entryId:
            entry.id,

          isLocked:
            nextValue,
        },
      ],
    );
  }

  function startSwap(
    entry: Entry,
  ) {
    if (
      entry.isLocked
    ) {
      setMessage(
        "الحصة مقفلة ولا يمكن تبديلها.",
      );

      return;
    }

    if (
      !swapEntryId
    ) {
      setSwapEntryId(
        entry.id,
      );

      setMessage(
        "اختر الآن الحصة الثانية للتبديل.",
      );

      return;
    }

    if (
      swapEntryId ===
      entry.id
    ) {
      setSwapEntryId(
        null,
      );

      setMessage(
        "تم إلغاء التبديل.",
      );

      return;
    }

    const first =
      entries.find(
        (item) =>
          item.id ===
          swapEntryId,
      );

    if (
      !first
    ) {
      setSwapEntryId(
        null,
      );

      return;
    }

    if (
      first.isLocked ||
      entry.isLocked
    ) {
      setMessage(
        "إحدى الحصتين مقفلة.",
      );

      return;
    }

    pushUndo();

    setEntries(
      (
        current,
      ) =>
        current.map(
          (item) => {
            if (
              item.id ===
              first.id
            ) {
              return {
                ...item,

                dayId:
                  entry.dayId,

                dayLabel:
                  entry.dayLabel,

                periodId:
                  entry.periodId,

                periodLabel:
                  entry.periodLabel,

                periodOrder:
                  entry.periodOrder,

                source:
                  "MANUAL_SWAP",
              };
            }

            if (
              item.id ===
              entry.id
            ) {
              return {
                ...item,

                dayId:
                  first.dayId,

                dayLabel:
                  first.dayLabel,

                periodId:
                  first.periodId,

                periodLabel:
                  first.periodLabel,

                periodOrder:
                  first.periodOrder,

                source:
                  "MANUAL_SWAP",
              };
            }

            return item;
          },
        ),
    );

    setEdits(
      (
        current,
      ) => [
        ...current,
        {
          type:
            "SWAP",

          firstEntryId:
            first.id,

          secondEntryId:
            entry.id,
        },
      ],
    );

    setSwapEntryId(
      null,
    );

    setMessage(
      "تم التبديل محليًا. احفظ التعديلات لإنشاء نسخة جديدة.",
    );
  }

  function undo() {
    const previous =
      undoStack[
        undoStack.length -
          1
      ];

    if (!previous) {
      return;
    }

    setEntries(
      previous.entries,
    );

    setEdits(
      previous.edits,
    );

    setUndoStack(
      (
        current,
      ) =>
        current.slice(
          0,
          -1,
        ),
    );

    setMessage(
      "تم التراجع عن آخر تعديل.",
    );
  }

  async function save() {
    if (
      !workspace ||
      edits.length ===
        0
    ) {
      return;
    }

    setSaving(
      true,
    );

    setError(
      null,
    );

    setMessage(
      null,
    );

    try {
      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v2/projects/${projectId}/review`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                baseScheduleId:
                  workspace.schedule.id,

                edits,
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
          "تعذر حفظ التعديلات.",
        );
      }

      setMessage(
        payload.message ??
        "تم حفظ نسخة جديدة.",
      );

      await load(
        payload.schedule.id,
      );

      router.refresh();
    }
    catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "تعذر حفظ التعديلات.",
      );
    }
    finally {
      setSaving(
        false,
      );
    }
  }

  if (
    loading
  ) {
    return (
      <div
        className="
          rounded-[28px]
          border border-slate-200
          bg-white
          p-8
          text-center
          text-sm font-bold
          text-slate-500
        "
      >
        جارٍ تحميل مساحة المراجعة...
      </div>
    );
  }

  if (
    !workspace
  ) {
    return (
      <div
        className="
          rounded-[28px]
          border border-rose-200
          bg-rose-50
          p-8
          text-center
          text-sm font-bold
          text-rose-700
        "
      >
        {error ??
          "تعذر تحميل الجدول."}
      </div>
    );
  }

  const teachingPeriods =
    workspace.project.periods.filter(
      (period) =>
        !period.isBreak,
    );

  return (
    <div
      dir="rtl"
      className="space-y-5"
    >
      <section
        className="
          rounded-[30px]
          border border-slate-200
          bg-gradient-to-l
          from-cyan-50
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
            gap-4
          "
        >
          <div>
            <div
              className="
                mb-2
                inline-flex
                rounded-full
                bg-cyan-100
                px-3 py-1
                text-xs font-black
                text-cyan-700
              "
            >
              الخطوة 9
            </div>

            <h1
              className="
                text-2xl
                font-black
                text-slate-950
              "
            >
              مراجعة الجدول والتعديل اليدوي
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
              التعديلات لا تغيّر النسخة الأصلية.
              عند الحفظ يتم إنشاء نسخة جديدة مستقلة.
            </p>
          </div>

          <div
            className="
              flex flex-wrap
              gap-2
            "
          >
            <button
              type="button"
              onClick={
                undo
              }
              disabled={
                undoStack.length ===
                0
              }
              className="
                rounded-2xl
                border border-slate-200
                bg-white
                px-4 py-2.5
                text-sm font-black
                text-slate-700
                disabled:opacity-40
              "
            >
              تراجع
            </button>

            <button
              type="button"
              onClick={
                save
              }
              disabled={
                saving ||
                edits.length ===
                  0
              }
              className="
                rounded-2xl
                bg-slate-950
                px-5 py-2.5
                text-sm font-black
                text-white
                disabled:opacity-40
              "
            >
              {saving
                ? "جارٍ الحفظ..."
                : `حفظ كنسخة جديدة (${edits.length})`}
            </button>
          </div>
        </div>

        <div
          className="
            mt-5 grid
            gap-3
            sm:grid-cols-2
            lg:grid-cols-5
          "
        >
          {[
            [
              "النسخة",
              `#${workspace.schedule.version}`,
            ],

            [
              "الجودة",
              `${workspace.schedule.score}%`,
            ],

            [
              "الاكتمال",
              `${workspace.schedule.completeness}%`,
            ],

            [
              "Hard",
              String(
                workspace.schedule.hardViolations,
              ),
            ],

            [
              "Penalty",
              String(
                workspace.schedule.softPenalty,
              ),
            ],
          ].map(
            ([label, value]) => (
              <div
                key={
                  label
                }
                className="
                  rounded-2xl
                  border border-slate-200
                  bg-white
                  px-4 py-3
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
                  className="
                    mt-1
                    text-lg font-black
                    text-slate-950
                  "
                >
                  {value}
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {message ? (
        <div
          className="
            rounded-2xl
            border border-emerald-200
            bg-emerald-50
            px-4 py-3
            text-sm font-bold
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
            px-4 py-3
            text-sm font-bold
            text-rose-700
          "
        >
          {error}
        </div>
      ) : null}

      <section
        className="
          rounded-[28px]
          border border-slate-200
          bg-white
          p-5
          shadow-sm
        "
      >
        <div
          className="
            flex flex-wrap
            items-center
            justify-between
            gap-3
          "
        >
          <select
            value={
              selectedClassId
            }
            onChange={
              (
                event,
              ) =>
                setSelectedClassId(
                  event.target.value,
                )
            }
            className="
              min-w-[220px]
              rounded-2xl
              border border-slate-200
              bg-white
              px-4 py-2.5
              text-sm font-black
            "
          >
            {workspace.classes.map(
              (
                classItem,
              ) => (
                <option
                  key={
                    classItem.id
                  }
                  value={
                    classItem.id
                  }
                >
                  {classItem.name}
                </option>
              ),
            )}
          </select>

          <select
            value={
              workspace.schedule.id
            }
            onChange={
              (
                event,
              ) =>
                void load(
                  event.target.value,
                )
            }
            className="
              min-w-[180px]
              rounded-2xl
              border border-slate-200
              bg-white
              px-4 py-2.5
              text-sm font-bold
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
            mt-5
            overflow-x-auto
          "
        >
          <table
            className="
              w-full
              min-w-[1000px]
              border-separate
              border-spacing-0
            "
          >
            <thead>
              <tr>
                <th
                  className="
                    sticky right-0
                    z-10
                    border border-slate-200
                    bg-slate-950
                    px-4 py-3
                    text-sm font-black
                    text-white
                  "
                >
                  الحصة
                </th>

                {workspace.project.days.map(
                  (
                    day,
                  ) => (
                    <th
                      key={
                        day.id
                      }
                      className="
                        border border-slate-200
                        bg-slate-950
                        px-4 py-3
                        text-sm font-black
                        text-white
                      "
                    >
                      {day.label}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {teachingPeriods.map(
                (
                  period,
                ) => (
                  <tr
                    key={
                      period.id
                    }
                  >
                    <td
                      className="
                        sticky right-0
                        z-10
                        border border-slate-200
                        bg-slate-50
                        px-3 py-3
                        text-center
                        text-sm font-black
                        text-slate-700
                      "
                    >
                      {period.label}
                    </td>

                    {workspace.project.days.map(
                      (
                        day,
                      ) => {
                        const entry =
                          bySlot.get(
                            slotKey(
                              day.id,
                              period.id,
                            ),
                          );

                        return (
                          <td
                            key={
                              `${day.id}:${period.id}`
                            }
                            onDoubleClick={
                              () =>
                                moveSelected(
                                  day.id,
                                  period.id,
                                )
                            }
                            className="
                              h-[112px]
                              border border-slate-200
                              bg-white
                              p-2
                              align-top
                            "
                          >
                            {entry ? (
                              <div
                                className={`
                                  h-full
                                  rounded-2xl
                                  border
                                  p-3
                                  transition
                                  ${
                                    selectedEntryId ===
                                    entry.id
                                      ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100"
                                      : "border-slate-200 bg-slate-50"
                                  }
                                `}
                              >
                                <button
                                  type="button"
                                  onClick={
                                    () =>
                                      setSelectedEntryId(
                                        entry.id,
                                      )
                                  }
                                  className="
                                    block w-full
                                    text-right
                                  "
                                >
                                  <div
                                    className="
                                      text-sm font-black
                                      text-slate-950
                                    "
                                  >
                                    {entry.subjectName}
                                  </div>

                                  <div
                                    className="
                                      mt-1
                                      text-xs font-bold
                                      text-slate-500
                                    "
                                  >
                                    {entry.teacherName}
                                  </div>
                                </button>

                                <div
                                  className="
                                    mt-3
                                    flex flex-wrap
                                    gap-1.5
                                  "
                                >
                                  <button
                                    type="button"
                                    onClick={
                                      () =>
                                        toggleLock(
                                          entry,
                                        )
                                    }
                                    className="
                                      rounded-lg
                                      border border-slate-200
                                      bg-white
                                      px-2 py-1
                                      text-[11px]
                                      font-black
                                    "
                                  >
                                    {entry.isLocked
                                      ? "فتح القفل"
                                      : "قفل"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={
                                      () =>
                                        startSwap(
                                          entry,
                                        )
                                    }
                                    className={`
                                      rounded-lg
                                      border
                                      px-2 py-1
                                      text-[11px]
                                      font-black
                                      ${
                                        swapEntryId ===
                                        entry.id
                                          ? "border-violet-400 bg-violet-50 text-violet-700"
                                          : "border-slate-200 bg-white"
                                      }
                                    `}
                                  >
                                    تبديل
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={
                                  () =>
                                    moveSelected(
                                      day.id,
                                      period.id,
                                    )
                                }
                                className="
                                  flex h-full w-full
                                  items-center
                                  justify-center
                                  rounded-2xl
                                  border border-dashed
                                  border-slate-200
                                  text-xs font-bold
                                  text-slate-300
                                  hover:border-cyan-300
                                  hover:bg-cyan-50
                                  hover:text-cyan-600
                                "
                              >
                                {selectedEntry
                                  ? "انقل هنا"
                                  : "فارغ"}
                              </button>
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
    </div>
  );
}