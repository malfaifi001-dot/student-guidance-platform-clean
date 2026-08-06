"use client";

import { useEffect, useMemo, useState } from "react";

type Day = {
  id: string;
  label: string;
};

type Period = {
  id: string;
  label: string;
  isBreak?: boolean;
  order?: number;
};

type ClassItem = {
  id: string;
  name: string;
};

type Teacher = {
  id: string;
  name: string;
};

type Session = {
  id: string;
  assignmentId: string;
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
  blockIndex: number;
  blockLength: number;
  isLocked?: boolean;
};

type ViewMode = "CLASS" | "TEACHER";

export function TimetableGenerationPanel({
  projectId,
  days,
  periods,
  classes,
  teachers,
}: {
  projectId: string;
  days: Day[];
  periods: Period[];
  classes: ClassItem[];
  teachers: Teacher[];
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [viewMode, setViewMode] =
    useState<ViewMode>("CLASS");
  const [selectedClassId, setSelectedClassId] = useState(
    classes[0]?.id || "",
  );
  const [selectedTeacherId, setSelectedTeacherId] =
    useState(teachers[0]?.id || "");
  const [selectedSessionId, setSelectedSessionId] =
    useState("");
  const [status, setStatus] = useState("DRAFT");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const teachingPeriods = useMemo(
    () => periods.filter((period) => !period.isBreak),
    [periods],
  );

  useEffect(() => {
    void loadSchedule();
  }, [projectId]);

  async function loadSchedule() {
    setLoading(true);

    const response = await fetch(
      `/api/dashboard/principal/timetable/projects/${projectId}/generate`,
      {
        cache: "no-store",
      },
    );

    const result = await response.json();
    setLoading(false);

    if (response.ok) {
      setSessions(
        Array.isArray(result.sessions)
          ? result.sessions
          : [],
      );
      setStatus(result.status || "DRAFT");
    }
  }

  async function generate() {
    setBusy(true);
    setMessage("");
    setErrors([]);
    setSelectedSessionId("");

    const response = await fetch(
      `/api/dashboard/principal/timetable/projects/${projectId}/generate`,
      {
        method: "POST",
      },
    );

    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setErrors(
        Array.isArray(result.errors)
          ? result.errors
          : [result.error || "تعذر إنشاء الجدول."],
      );
      return;
    }

    setSessions(result.sessions || []);
    setStatus("GENERATED");
    setMessage("تم إنشاء الجدول وحفظه.");
  }

  async function save(nextSessions = sessions) {
    setBusy(true);
    setMessage("");
    setErrors([]);

    const response = await fetch(
      `/api/dashboard/principal/timetable/projects/${projectId}/manage`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "SAVE",
          sessions: nextSessions,
        }),
      },
    );

    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setErrors([
        result.error || "تعذر حفظ التعديلات.",
      ]);
      return false;
    }

    setSessions(nextSessions);
    setStatus("GENERATED");
    setMessage("تم حفظ تعديلات الجدول.");
    return true;
  }

  async function updateStatus(
    nextStatus: "APPROVED" | "PUBLISHED",
  ) {
    setBusy(true);
    setMessage("");
    setErrors([]);

    const response = await fetch(
      `/api/dashboard/principal/timetable/projects/${projectId}/manage`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "STATUS",
          status: nextStatus,
        }),
      },
    );

    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setErrors([
        result.error || "تعذر تحديث حالة الجدول.",
      ]);
      return;
    }

    setStatus(result.status);
    setMessage(
      nextStatus === "APPROVED"
        ? "تم اعتماد الجدول."
        : "تم نشر الجدول.",
    );
  }

  async function handleSessionClick(session: Session) {
    if (busy) {
      return;
    }

    if (!selectedSessionId) {
      setSelectedSessionId(session.id);
      setMessage(
        session.isLocked
          ? "الحصة مقفلة. افتح القفل قبل تبديلها."
          : "اختر الحصة الثانية لإتمام التبديل.",
      );
      return;
    }

    if (selectedSessionId === session.id) {
      setSelectedSessionId("");
      setMessage("");
      return;
    }

    const first = sessions.find(
      (item) => item.id === selectedSessionId,
    );

    if (!first) {
      setSelectedSessionId("");
      return;
    }

    if (first.isLocked || session.isLocked) {
      setSelectedSessionId("");
      setErrors([
        "لا يمكن تبديل حصة مقفلة.",
      ]);
      return;
    }

    const nextSessions = sessions.map((item) => {
      if (item.id === first.id) {
        return {
          ...item,
          dayId: session.dayId,
          dayLabel: session.dayLabel,
          periodId: session.periodId,
          periodLabel: session.periodLabel,
          periodOrder: session.periodOrder,
        };
      }

      if (item.id === session.id) {
        return {
          ...item,
          dayId: first.dayId,
          dayLabel: first.dayLabel,
          periodId: first.periodId,
          periodLabel: first.periodLabel,
          periodOrder: first.periodOrder,
        };
      }

      return item;
    });

    setSelectedSessionId("");
    await save(nextSessions);
  }

  async function toggleLock(session: Session) {
    const nextSessions = sessions.map((item) =>
      item.id === session.id
        ? {
            ...item,
            isLocked: !item.isLocked,
          }
        : item,
    );

    await save(nextSessions);
  }

  const selectedClass =
    classes.find(
      (item) => item.id === selectedClassId,
    ) || classes[0];

  const selectedTeacher =
    teachers.find(
      (item) => item.id === selectedTeacherId,
    ) || teachers[0];

  function findSession(
    dayId: string,
    periodId: string,
  ) {
    return sessions.find((session) => {
      if (
        session.dayId !== dayId ||
        session.periodId !== periodId
      ) {
        return false;
      }

      return viewMode === "CLASS"
        ? session.classId === selectedClass?.id
        : session.teacherId === selectedTeacher?.id;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            إنشاء وتحرير الجدول
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            اختر حصتين لتبديلهما، ويمكن قفل الحصة.
          </p>

          <p className="mt-2 text-sm font-black text-sky-700">
            الحالة: {statusLabel(status)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void generate()}
            className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            {busy
              ? "جارٍ التنفيذ..."
              : sessions.length
                ? "إعادة التوليد"
                : "إنشاء الجدول"}
          </button>

          <button
            type="button"
            disabled={
              busy ||
              !sessions.length ||
              status === "APPROVED" ||
              status === "PUBLISHED"
            }
            onClick={() =>
              void updateStatus("APPROVED")
            }
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40"
          >
            اعتماد
          </button>

          <button
            type="button"
            disabled={
              busy ||
              status !== "APPROVED"
            }
            onClick={() =>
              void updateStatus("PUBLISHED")
            }
            className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40"
          >
            نشر
          </button>
        </div>
      </div>

      {errors.length ? (
        <div className="mt-4 space-y-2">
          {errors.map((error, index) => (
            <p
              key={`${error}:${index}`}
              className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800"
            >
              {error}
            </p>
          ))}
        </div>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">
          جارٍ تحميل الجدول...
        </p>
      ) : null}

      {!loading && sessions.length ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex rounded-xl border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => setViewMode("CLASS")}
                className={[
                  "rounded-lg px-4 py-2 text-sm font-black",
                  viewMode === "CLASS"
                    ? "bg-sky-700 text-white"
                    : "text-slate-600",
                ].join(" ")}
              >
                جدول الفصل
              </button>

              <button
                type="button"
                onClick={() => setViewMode("TEACHER")}
                className={[
                  "rounded-lg px-4 py-2 text-sm font-black",
                  viewMode === "TEACHER"
                    ? "bg-sky-700 text-white"
                    : "text-slate-600",
                ].join(" ")}
              >
                جدول المعلم
              </button>
            </div>

            <Select
              label={
                viewMode === "CLASS"
                  ? "الفصل"
                  : "المعلم"
              }
              value={
                viewMode === "CLASS"
                  ? selectedClass?.id || ""
                  : selectedTeacher?.id || ""
              }
              onChange={
                viewMode === "CLASS"
                  ? setSelectedClassId
                  : setSelectedTeacherId
              }
              options={
                viewMode === "CLASS"
                  ? classes.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))
                  : teachers.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))
              }
            />

            <a
              href={
                `/dashboard/principal/timetable/${projectId}/print` +
                `?mode=${viewMode === "CLASS" ? "class" : "teacher"}` +
                `&id=${encodeURIComponent(
                  viewMode === "CLASS"
                    ? selectedClass?.id || ""
                    : selectedTeacher?.id || "",
                )}` +
                "&print=1"
              }
              target="_blank"
              rel="noreferrer"
              className="self-end rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-black text-white"
            >
              طباعة الجدول
            </a>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-slate-200 bg-slate-50 p-3">
                    الحصة
                  </th>

                  {days.map((day) => (
                    <th
                      key={day.id}
                      className="border border-slate-200 bg-slate-50 p-3"
                    >
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {teachingPeriods.map((period) => (
                  <tr key={period.id}>
                    <th className="border border-slate-200 p-3">
                      {period.label}
                    </th>

                    {days.map((day) => {
                      const session = findSession(
                        day.id,
                        period.id,
                      );

                      return (
                        <td
                          key={`${day.id}:${period.id}`}
                          className="h-28 border border-slate-200 p-2 align-top"
                        >
                          {session ? (
                            <button
                              type="button"
                              onClick={() =>
                                void handleSessionClick(
                                  session,
                                )
                              }
                              className={[
                                "w-full rounded-xl p-2 text-right",
                                selectedSessionId === session.id
                                  ? "ring-2 ring-sky-500"
                                  : "",
                                session.isLocked
                                  ? "bg-amber-50"
                                  : "bg-sky-50",
                              ].join(" ")}
                            >
                              <p className="font-black text-sky-900">
                                {session.subjectName}
                              </p>

                              <p className="mt-1 text-xs text-slate-600">
                                {viewMode === "CLASS"
                                  ? session.teacherName
                                  : session.className}
                              </p>

                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void toggleLock(session);
                                }}
                                className="mt-2 inline-block text-xs font-black text-amber-700"
                              >
                                {session.isLocked
                                  ? "فتح القفل"
                                  : "قفل الحصة"}
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">
                              فارغ
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <label className="grid min-w-56 gap-2 text-sm font-bold">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="rounded-xl border border-slate-200 px-3 py-2.5"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function statusLabel(status: string) {
  if (status === "GENERATED") return "تم التوليد";
  if (status === "APPROVED") return "معتمد";
  if (status === "PUBLISHED") return "منشور";
  return "مسودة";
}