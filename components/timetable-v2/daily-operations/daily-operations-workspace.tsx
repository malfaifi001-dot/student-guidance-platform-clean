"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Session = {
  id: string;

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

  isLocked?: boolean;
};

type Teacher = {
  id: string;
  name: string;
};

type Day = {
  id: string;
  label: string;
};

type Props = {
  projectId: string;
};

export function TimetableV2DailyOperationsWorkspace({
  projectId,
}: Props) {
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
    useState<
      string | null
    >(
      null,
    );

  const [
    sessions,
    setSessions,
  ] =
    useState<
      Session[]
    >(
      [],
    );

  const [
    teachers,
    setTeachers,
  ] =
    useState<
      Teacher[]
    >(
      [],
    );

  const [
    days,
    setDays,
  ] =
    useState<
      Day[]
    >(
      [],
    );

  const [
    selectedDayId,
    setSelectedDayId,
  ] =
    useState(
      "",
    );

  const [
    selectedTeacherId,
    setSelectedTeacherId,
  ] =
    useState(
      "",
    );

  const [
    popCard,
    setPopCard,
  ] =
    useState<{
      title: string;
      description: string;
    } | null>(
      null,
    );

  async function load(
    dayId?: string,
    teacherId?: string,
  ) {
    setLoading(
      true,
    );

    setError(
      null,
    );

    try {
      const params =
        new URLSearchParams();

      if (dayId) {
        params.set(
          "dayId",
          dayId,
        );
      }

      if (teacherId) {
        params.set(
          "teacherId",
          teacherId,
        );
      }

      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v2/projects/${projectId}/daily-operations?${params.toString()}`,
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
          "تعذر تحميل التشغيل اليومي.",
        );
      }

      setSessions(
        payload.sessions,
      );

      setTeachers(
        payload.teachers,
      );

      setDays(
        payload.days,
      );

      if (
        !selectedDayId &&
        payload.days.length >
          0
      ) {
        setSelectedDayId(
          payload.days[0].id,
        );
      }
    }
    catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "تعذر تحميل التشغيل اليومي.",
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

  useEffect(
    () => {
      if (
        !selectedDayId
      ) {
        return;
      }

      void load(
        selectedDayId,
        selectedTeacherId ||
          undefined,
      );
    },
    [
      selectedDayId,
      selectedTeacherId,
    ],
  );

  const grouped =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Session[]
          >();

        for (
          const session of
          sessions
        ) {
          const current =
            map.get(
              session.teacherId,
            ) ??
            [];

          current.push(
            session,
          );

          map.set(
            session.teacherId,
            current,
          );
        }

        return Array.from(
          map.entries(),
        )
          .map(
            (
              [
                teacherId,
                teacherSessions,
              ],
            ) => ({
              teacherId,

              teacherName:
                teacherSessions[0]
                  ?.teacherName ??
                teacherId,

              sessions:
                teacherSessions.sort(
                  (
                    first,
                    second,
                  ) =>
                    first.periodOrder -
                    second.periodOrder,
                ),
            }),
          )
          .sort(
            (
              first,
              second,
            ) =>
              first.teacherName.localeCompare(
                second.teacherName,
                "ar",
              ),
          );
      },
      [
        sessions,
      ],
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
          from-violet-50
          via-white
          to-cyan-50
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
                bg-violet-100
                px-3 py-1
                text-xs font-black
                text-violet-700
              "
            >
              الخطوة 11
            </div>

            <h1
              className="
                mt-3
                text-3xl font-black
                text-slate-950
              "
            >
              التشغيل اليومي
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
              هذه الشاشة تقرأ الجدول المنشور فقط.
              عمليات الغياب والانتظار والبدائل ستكون
              سجلات تشغيلية مستقلة ولن تغيّر الجدول الأساسي.
            </p>
          </div>
        </div>
      </section>

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
          rounded-[28px]
          border border-slate-200
          bg-white
          p-5
          shadow-sm
        "
      >
        <div
          className="
            grid gap-3
            md:grid-cols-2
          "
        >
          <div>
            <label
              className="
                mb-2 block
                text-xs font-black
                text-slate-500
              "
            >
              اليوم
            </label>

            <select
              value={
                selectedDayId
              }
              onChange={
                (
                  event,
                ) =>
                  setSelectedDayId(
                    event.target.value,
                  )
              }
              className="
                w-full
                rounded-2xl
                border border-slate-200
                bg-white
                px-4 py-3
                text-sm font-black
              "
            >
              {days.map(
                (
                  day,
                ) => (
                  <option
                    key={
                      day.id
                    }
                    value={
                      day.id
                    }
                  >
                    {day.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              className="
                mb-2 block
                text-xs font-black
                text-slate-500
              "
            >
              المعلم
            </label>

            <select
              value={
                selectedTeacherId
              }
              onChange={
                (
                  event,
                ) =>
                  setSelectedTeacherId(
                    event.target.value,
                  )
              }
              className="
                w-full
                rounded-2xl
                border border-slate-200
                bg-white
                px-4 py-3
                text-sm font-black
              "
            >
              <option value="">
                جميع المعلمين
              </option>

              {teachers.map(
                (
                  teacher,
                ) => (
                  <option
                    key={
                      teacher.id
                    }
                    value={
                      teacher.id
                    }
                  >
                    {teacher.name}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <div
          className="
            rounded-[28px]
            border border-slate-200
            bg-white
            p-10
            text-center
            text-sm font-bold
            text-slate-500
          "
        >
          جارٍ تحميل حصص اليوم...
        </div>
      ) : (
        <section
          className="
            grid gap-4
            xl:grid-cols-2
          "
        >
          {grouped.map(
            (
              group,
            ) => (
              <article
                key={
                  group.teacherId
                }
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
                  <div>
                    <h2
                      className="
                        text-lg font-black
                        text-slate-950
                      "
                    >
                      {group.teacherName}
                    </h2>

                    <div
                      className="
                        mt-1
                        text-xs font-bold
                        text-slate-400
                      "
                    >
                      {group.sessions.length} حصة في اليوم
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      () =>
                        setPopCard({
                          title:
                            `تسجيل غياب ${group.teacherName}`,

                          description:
                            "واجهة تسجيل الغياب وربطها باقتراح البدلاء ستكون الجزء التالي من المرحلة 11. الجدول الأساسي لن يتم تعديله.",
                        })
                    }
                    className="
                      rounded-2xl
                      bg-violet-700
                      px-4 py-2.5
                      text-xs font-black
                      text-white
                    "
                  >
                    تسجيل غياب
                  </button>
                </div>

                <div
                  className="
                    mt-4
                    space-y-2
                  "
                >
                  {group.sessions.map(
                    (
                      session,
                    ) => (
                      <div
                        key={
                          session.id
                        }
                        className="
                          flex flex-wrap
                          items-center
                          justify-between
                          gap-3
                          rounded-2xl
                          border border-slate-200
                          bg-slate-50
                          px-4 py-3
                        "
                      >
                        <div>
                          <div
                            className="
                              text-sm font-black
                              text-slate-950
                            "
                          >
                            {session.subjectName}
                          </div>

                          <div
                            className="
                              mt-1
                              text-xs font-bold
                              text-slate-500
                            "
                          >
                            {session.className}
                          </div>
                        </div>

                        <div
                          className="
                            rounded-xl
                            bg-white
                            px-3 py-2
                            text-xs font-black
                            text-slate-700
                          "
                        >
                          {session.periodLabel}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </article>
            ),
          )}

          {grouped.length ===
            0 ? (
            <div
              className="
                col-span-full
                rounded-[28px]
                border border-dashed
                border-slate-300
                bg-white
                p-12
                text-center
                text-sm font-bold
                text-slate-400
              "
            >
              لا توجد حصص مطابقة لهذا اليوم أو المعلم.
            </div>
          ) : null}
        </section>
      )}

      {popCard ? (
        <div
          className="
            fixed inset-0
            z-[100]
            flex items-center
            justify-center
            bg-slate-950/30
            p-4
            backdrop-blur-sm
          "
        >
          <div
            className="
              w-full
              max-w-md
              rounded-[28px]
              border border-slate-200
              bg-white
              p-6
              shadow-2xl
            "
          >
            <h3
              className="
                text-lg font-black
                text-slate-950
              "
            >
              {popCard.title}
            </h3>

            <p
              className="
                mt-3
                text-sm leading-7
                text-slate-600
              "
            >
              {popCard.description}
            </p>

            <button
              type="button"
              onClick={
                () =>
                  setPopCard(
                    null,
                  )
              }
              className="
                mt-5
                w-full
                rounded-2xl
                bg-slate-950
                px-4 py-3
                text-sm font-black
                text-white
              "
            >
              إغلاق
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}