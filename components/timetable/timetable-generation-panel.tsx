"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { AlertTriangle } from "lucide-react";

import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import { TimetableDataCard, TimetableEmptyState } from "@/components/timetable/timetable-data-card";

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

type ViewMode =
  | "CLASS"
  | "TEACHER"
  | "OVERVIEW";

function getGenerationFailureStorageKey(
  projectId: string,
) {
  return `timetable:generation-failure:${projectId}`;
}

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

  const [selectedClassId, setSelectedClassId] =
    useState(classes[0]?.id || "");

  const [selectedTeacherId, setSelectedTeacherId] =
    useState(teachers[0]?.id || "");

  const [selectedDayId, setSelectedDayId] =
    useState(days[0]?.id || "");

  const [selectedSessionId, setSelectedSessionId] =
    useState("");

  const [status, setStatus] = useState("DRAFT");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const teachingPeriods = useMemo(
    () =>
      periods
        .filter((period) => !period.isBreak)
        .sort(
          (first, second) =>
            (first.order || 0) -
            (second.order || 0),
        ),
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

    if (!response.ok) {
      setErrors([
        result.error || "تعذر تحميل الجدول.",
      ]);
      return;
    }

    setSessions(
      Array.isArray(result.sessions)
        ? result.sessions
        : [],
    );

    setStatus(result.status || "DRAFT");
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
      const nextErrors =
        Array.isArray(result.errors)
          ? result.errors.filter(
              (item: unknown): item is string =>
                typeof item === "string" &&
                Boolean(item.trim()),
            )
          : [
              result.error ||
                "تعذر إنشاء الجدول.",
            ];

      setErrors(nextErrors);

      const failurePayload = {
        projectId,
        errors: nextErrors,
        occurredAt:
          new Date().toISOString(),
        autoAnalyze: true,
      };

      sessionStorage.setItem(
        getGenerationFailureStorageKey(
          projectId,
        ),
        JSON.stringify(
          failurePayload,
        ),
      );

      window.dispatchEvent(
        new CustomEvent(
          "timetable:generation-failed",
          {
            detail: failurePayload,
          },
        ),
      );

      return;
    }

    sessionStorage.removeItem(
      getGenerationFailureStorageKey(
        projectId,
      ),
    );

    setSessions(result.sessions || []);
    setStatus("GENERATED");
    setMessage("تم إنشاء الجدول وحفظه.");
  }

  async function save(
    nextSessions = sessions,
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
          action: "SAVE",
          sessions: nextSessions,
        }),
      },
    );

    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setErrors([
        result.error ||
          "تعذر حفظ تعديلات الجدول.",
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
        result.error ||
          "تعذر تحديث حالة الجدول.",
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

  async function handleSessionClick(
    session: Session,
  ) {
    if (busy || viewMode === "OVERVIEW") {
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
      (item) =>
        item.id === selectedSessionId,
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

    const nextSessions = sessions.map(
      (item) => {
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
      },
    );

    setSelectedSessionId("");
    await save(nextSessions);
  }

  async function toggleLock(
    session: Session,
  ) {
    const nextSessions = sessions.map(
      (item) =>
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
      (item) =>
        item.id === selectedClassId,
    ) || classes[0];

  const selectedTeacher =
    teachers.find(
      (item) =>
        item.id === selectedTeacherId,
    ) || teachers[0];

  const selectedDay =
    days.find(
      (item) =>
        item.id === selectedDayId,
    ) || days[0];

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
        : session.teacherId ===
            selectedTeacher?.id;
    });
  }

  function findOverviewSession(
    classId: string,
    periodId: string,
  ) {
    return sessions.find(
      (session) =>
        session.classId === classId &&
        session.dayId === selectedDay?.id &&
        session.periodId === periodId,
    );
  }

  return (
    <div dir="rtl" className="space-y-5">
      <section className="flex flex-col justify-between gap-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            إنشاء وتحرير الجدول
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            اعرض الجدول حسب الفصل أو المعلم، أو شاهد جميع الفصول في يوم واحد.
          </p>

          <span className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-black ${statusBadgeClass(status)}`}>
            الحالة: {statusLabel(status)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => void generate()}
            className="rounded-full bg-sky-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:opacity-100"
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
            className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:opacity-100"
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
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:opacity-100"
          >
            نشر
          </button>
        </div>
      </section>

      {errors.length ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {errors.map((error, index) => (
            <TimetableDataCard
              key={`${error}:${index}`}
              icon={<AlertTriangle className="h-5 w-5" />}
              eyebrow="تعذر التوليد"
              title={error}
              tone="amber"
              badges={["يتطلب معالجة"]}
            />
          ))}
        </div>
      ) : null}

      <SmartFeedbackModal
        open={Boolean(message)}
        type={errors.length ? "error" : "success"}
        title={errors.length ? "تعذر إكمال العملية" : "تمت العملية"}
        description={message}
        primaryActionLabel="حسنًا"
        onOpenChange={(open) => {
          if (!open) setMessage("");
        }}
      />

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">
          جارٍ تحميل الجدول...
        </p>
      ) : null}

      {!loading && sessions.length ? (
        <div className="space-y-5">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-3">
              <ModeButton
                active={viewMode === "CLASS"}
                onClick={() =>
                  setViewMode("CLASS")
                }
              >
                جدول الفصل
              </ModeButton>

              <ModeButton
                active={viewMode === "TEACHER"}
                onClick={() =>
                  setViewMode("TEACHER")
                }
              >
                جدول المعلم
              </ModeButton>

              <ModeButton
                active={viewMode === "OVERVIEW"}
                onClick={() =>
                  setViewMode("OVERVIEW")
                }
              >
                العرض العام للفصول
              </ModeButton>
            </div>

            {viewMode === "CLASS" ? (
              <Select
                label="الفصل"
                value={selectedClass?.id || ""}
                onChange={setSelectedClassId}
                options={classes.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            ) : null}

            {viewMode === "TEACHER" ? (
              <Select
                label="المعلم"
                value={selectedTeacher?.id || ""}
                onChange={setSelectedTeacherId}
                options={teachers.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            ) : null}

            {viewMode === "OVERVIEW" ? (
              <Select
                label="اليوم"
                value={selectedDay?.id || ""}
                onChange={setSelectedDayId}
                options={days.map((item) => ({
                  value: item.id,
                  label: item.label,
                }))}
              />
            ) : null}

            {viewMode !== "OVERVIEW" ? (
              <a
                href={
                  `/dashboard/principal/timetable/${projectId}/print` +
                  `?mode=${
                    viewMode === "CLASS"
                      ? "class"
                      : "teacher"
                  }` +
                  `&id=${encodeURIComponent(
                    viewMode === "CLASS"
                      ? selectedClass?.id || ""
                      : selectedTeacher?.id || "",
                  )}` +
                  "&print=1"
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800 xl:mr-auto"
              >
                طباعة الجدول
              </a>
            ) : null}
          </div>
          </section>

          <section className="border-t border-slate-200 pt-5">

          {viewMode === "OVERVIEW" ? (
            <OverviewTable
              classes={classes}
              periods={teachingPeriods}
              selectedDayLabel={
                selectedDay?.label || ""
              }
              findSession={findOverviewSession}
            />
          ) : (
            <SingleScheduleTable
              days={days}
              periods={teachingPeriods}
              viewMode={viewMode}
              selectedSessionId={
                selectedSessionId
              }
              findSession={findSession}
              onSessionClick={
                handleSessionClick
              }
              onToggleLock={toggleLock}
            />
          )}
          </section>
        </div>
      ) : null}

      {!loading && !sessions.length ? (
        <div className="mt-5">
          <TimetableEmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="لم يتم إنشاء الجدول بعد"
            description="ستظهر معاينات الجدول هنا بعد اكتمال التوليد."
          />
        </div>
      ) : null}
    </div>
  );
}

function OverviewTable({
  classes,
  periods,
  selectedDayLabel,
  findSession,
}: {
  classes: ClassItem[];
  periods: Period[];
  selectedDayLabel: string;
  findSession: (
    classId: string,
    periodId: string,
  ) => Session | undefined;
}) {
  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">
            العرض العام للفصول
          </h3>

          <p className="text-sm text-slate-500">
            {selectedDayLabel}
          </p>
        </div>

        <p className="text-xs font-bold text-slate-500">
          {classes.length} فصل
        </p>
      </div>

      <div className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] table-fixed border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky right-0 z-20 w-52 border border-slate-200 bg-slate-100 p-3 text-right">
                الفصل
              </th>

              {periods.map((period) => (
                <th
                  key={period.id}
                  className="min-w-32 border border-slate-200 bg-slate-50 p-3 text-center"
                >
                  <span className="block font-black text-slate-900">
                    {period.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {classes.map((classItem) => (
              <tr key={classItem.id}>
                <th className="sticky right-0 z-10 border border-slate-200 bg-white p-3 text-right font-black text-slate-900">
                  {classItem.name}
                </th>

                {periods.map((period) => {
                  const session = findSession(
                    classItem.id,
                    period.id,
                  );

                  return (
                    <td
                      key={`${classItem.id}:${period.id}`}
                      className="h-24 border border-slate-200 p-1.5 align-middle"
                    >
                      {session ? (
                        <div
                          className={[
                            "grid min-h-20 place-content-center rounded-xl px-2 py-2 text-center",
                            session.isLocked
                              ? "bg-amber-50"
                              : "bg-sky-50",
                          ].join(" ")}
                        >
                          <p className="font-black text-sky-900">
                            {session.subjectName}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-600">
                            {session.teacherName}
                          </p>

                          {session.blockLength === 2 ? (
                            <span className="mt-1 text-[10px] font-black text-violet-700">
                              حصة مزدوجة
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="grid min-h-20 place-content-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                          —
                        </div>
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
  );
}

function SingleScheduleTable({
  days,
  periods,
  viewMode,
  selectedSessionId,
  findSession,
  onSessionClick,
  onToggleLock,
}: {
  days: Day[];
  periods: Period[];
  viewMode: "CLASS" | "TEACHER";
  selectedSessionId: string;
  findSession: (
    dayId: string,
    periodId: string,
  ) => Session | undefined;
  onSessionClick: (
    session: Session,
  ) => Promise<void>;
  onToggleLock: (
    session: Session,
  ) => Promise<void>;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
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
          {periods.map((period) => (
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
                          void onSessionClick(
                            session,
                          )
                        }
                        className={[
                          "w-full rounded-xl p-2 text-right",
                          selectedSessionId ===
                          session.id
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

                        {session.blockLength === 2 ? (
                          <p className="mt-1 text-[10px] font-black text-violet-700">
                            حصة مزدوجة
                          </p>
                        ) : null}

                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();

                            void onToggleLock(
                              session,
                            );
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
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2.5 text-sm font-black transition",
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "text-slate-600 hover:bg-white hover:text-sky-700",
      ].join(" ")}
    >
      {children}
    </button>
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
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
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
  if (status === "GENERATED") {
    return "تم التوليد";
  }

  if (status === "APPROVED") {
    return "معتمد";
  }

  if (status === "PUBLISHED") {
    return "منشور";
  }

  return "مسودة";
}

function statusBadgeClass(status: string) {
  if (status === "PUBLISHED") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  if (status === "APPROVED") return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
  if (status === "GENERATED") return "bg-violet-50 text-violet-700 ring-1 ring-violet-100";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}
