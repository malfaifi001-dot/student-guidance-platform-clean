"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  TimetableOperationsSettingsPanels,
  type OperationsWorkspaceSection,
  type SupervisionDuty,
  type WaitingPolicy,
} from "@/components/timetable-v2/daily-operations/daily-operations-settings-panels";
import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import { SmartActionModal } from "@/components/ui/smart-action-modal";

import {
  buildWaitingRelaxationAdvice,
  type WaitingExcludedTeacher,
} from "@/lib/timetable-v2/daily-operations/waiting-relaxation-advisor";

type Teacher = {
  id: string;
  name: string;
  specialty: string | null;
  maxWeeklyLoad: number;
  weeklyLoad: number;
};

type DayItem = {
  id: string;
  label: string;
  order: number;
};

type Period = {
  id: string;
  label: string;
  order: number;
  isBreak?: boolean;
};

type Candidate = {
  teacherId: string;
  teacherName: string;
  specialty: string | null;
  weeklyLoad: number;
  referenceLoad: number;
  basicBalance: number;
  weeklyExecuted: number;
  dailyExecuted: number;
  remainingBalance: number;
  score: number;
  rank: number;
  reasons: string[];
  reasonLabels: string[];
};

type CandidatePayload = {
  candidates?: Candidate[];

  excluded?:
    WaitingExcludedTeacher[];
};

type Substitution = {
  id: string;
  periodId: string;
  className: string;
  subjectName: string;
  status: string;
  candidateRank: number | null;
  candidateScore: number | null;
  selectionReason: string | null;
  candidatesJson: CandidatePayload | null;
  substituteTeacherId: string | null;
  substituteTeacher: {
    id: string;
    name: string;
    specialty: string | null;
  } | null;
};

type Absence = {
  id: string;
  teacherId: string;
  absenceDate: string;
  absenceType: string;
  status: string;
  reason: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  teacher: {
    id: string;
    name: string;
    specialty: string | null;
  };
  substitutions: Substitution[];
};

type Dashboard = {
  project: {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
    status: string;
  };
  teachers: Teacher[];
  days: DayItem[];
  periods: Period[];
  schedule: unknown[];
  policy: WaitingPolicy | null;
  absences: Absence[];
  supervisionDuties: SupervisionDuty[];
};

type AbsenceType =
  | "FULL_DAY"
  | "SELECTED_PERIODS"
  | "LATE_ARRIVAL"
  | "EARLY_DEPARTURE";

type Notice = {
  tone: "success" | "error" | "info";
  title: string;
  message: string;
};

const dayByWeekday: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export function TimetableV2DailyOperationsCenter({
  projectId,
}: {
  projectId: string;
}) {
  const [dashboard, setDashboard] =
    useState<Dashboard | null>(null);

  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState("");
  const [notice, setNotice] =
    useState<Notice | null>(null);
  const [absencePendingDeletion, setAbsencePendingDeletion] =
    useState<string | null>(null);

  const [
    workspaceSection,
    setWorkspaceSection,
  ] = useState<OperationsWorkspaceSection>(
    "ABSENCE",
  );

  const [teacherId, setTeacherId] = useState("");
  const [absenceDate, setAbsenceDate] =
    useState(getTodayValue());

  const [dayId, setDayId] = useState(
    getDayIdFromDate(getTodayValue()),
  );

  const [absenceType, setAbsenceType] =
    useState<AbsenceType>("FULL_DAY");

  const [periodIds, setPeriodIds] = useState<string[]>([]);
  const [arrivalPeriodId, setArrivalPeriodId] =
    useState("");

  const [departurePeriodId, setDeparturePeriodId] =
    useState("");

  const [
    absenceModalOpen,
    setAbsenceModalOpen,
  ] = useState(false);

  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const endpoint =
    `/api/dashboard/timetable-v2/projects/${projectId}/daily-operations`;

  const teachingPeriods = useMemo(
    () =>
      (dashboard?.periods || [])
        .filter((period) => !period.isBreak)
        .sort(
          (first, second) =>
            first.order - second.order,
        ),
    [dashboard?.periods],
  );

  const sortedAbsences = useMemo(
    () =>
      [...(dashboard?.absences || [])].sort(
        (first, second) =>
          new Date(second.absenceDate).getTime() -
          new Date(first.absenceDate).getTime(),
      ),
    [dashboard?.absences],
  );

  const selectedDateAbsences = useMemo(
    () =>
      sortedAbsences.filter(
        (absence) =>
          dateOnly(absence.absenceDate) ===
          absenceDate,
      ),
    [absenceDate, sortedAbsences],
  );

  const metrics = useMemo(() => {
    const substitutions =
      selectedDateAbsences.flatMap(
        (absence) => absence.substitutions,
      );

    const covered = substitutions.filter(
      (item) =>
        item.status === "ASSIGNED" ||
        item.status === "NOTIFIED" ||
        item.status === "COMPLETED" ||
        item.status === "REASSIGNED",
    ).length;

    const completed = substitutions.filter(
      (item) => item.status === "COMPLETED",
    ).length;

    return {
      absences: selectedDateAbsences.length,
      affected: substitutions.length,
      covered,
      uncovered:
        substitutions.length - covered,
      completed,
    };
  }, [selectedDateAbsences]);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
        });

        const result = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error ||
              "تعذر تحميل التشغيل اليومي.",
          );
        }

        const nextDashboard =
          result.dashboard as Dashboard;

        setDashboard(nextDashboard);

        setTeacherId((current) =>
          current ||
          nextDashboard.teachers[0]?.id ||
          "",
        );

        setDayId((current) => {
          const derived =
            getDayIdFromDate(absenceDate);

          return nextDashboard.days.some(
            (day) => day.id === derived,
          )
            ? derived
            : current ||
                nextDashboard.days[0]?.id ||
                "";
        });
      } catch (error) {
        showNotice(
          "error",
          "تعذر تحميل البيانات",
          getErrorMessage(error),
        );
      } finally {
        setLoading(false);
      }
    },
    [absenceDate, endpoint],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function showNotice(
    tone: Notice["tone"],
    title: string,
    message: string,
  ) {
    setNotice({
      tone,
      title,
      message,
    });
  }

  function handleDateChange(value: string) {
    setAbsenceDate(value);

    const nextDay = getDayIdFromDate(value);

    if (
      dashboard?.days.some(
        (day) => day.id === nextDay,
      )
    ) {
      setDayId(nextDay);
    }
  }

  function togglePeriod(periodId: string) {
    setPeriodIds((current) =>
      current.includes(periodId)
        ? current.filter(
            (item) => item !== periodId,
          )
        : [...current, periodId],
    );
  }

  async function postAction(
    payload: Record<string, unknown>,
    workingId: string,
  ) {
    setWorkingKey(workingId);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "تعذر تنفيذ العملية.",
        );
      }

      return result;
    } finally {
      setWorkingKey("");
    }
  }

  async function createAbsence() {
    if (!teacherId) {
      showNotice(
        "error",
        "المعلم مطلوب",
        "اختر المعلم المراد تسجيل غيابه.",
      );
      return;
    }

    if (!absenceDate || !dayId) {
      showNotice(
        "error",
        "التاريخ غير مكتمل",
        "حدد تاريخ الغياب واليوم الدراسي.",
      );
      return;
    }

    if (
      absenceType === "SELECTED_PERIODS" &&
      !periodIds.length
    ) {
      showNotice(
        "error",
        "الحصص مطلوبة",
        "اختر حصة واحدة على الأقل.",
      );
      return;
    }

    if (
      absenceType === "LATE_ARRIVAL" &&
      !arrivalPeriodId
    ) {
      showNotice(
        "error",
        "حصة الحضور مطلوبة",
        "حدد الحصة التي سيحضر عندها المعلم.",
      );
      return;
    }

    if (
      absenceType === "EARLY_DEPARTURE" &&
      !departurePeriodId
    ) {
      showNotice(
        "error",
        "حصة الانصراف مطلوبة",
        "حدد آخر حصة قبل انصراف المعلم.",
      );
      return;
    }

    try {
      await postAction(
        {
          action: "CREATE_ABSENCE",
          data: {
            teacherId,
            absenceDate,
            dayId,
            absenceType,
            periodIds:
              absenceType ===
              "SELECTED_PERIODS"
                ? periodIds
                : [],
            arrivalPeriodId:
              absenceType === "LATE_ARRIVAL"
                ? arrivalPeriodId
                : undefined,
            departurePeriodId:
              absenceType ===
              "EARLY_DEPARTURE"
                ? departurePeriodId
                : undefined,
            reason: reason.trim() || undefined,
            note: note.trim() || undefined,
          },
        },
        "create-absence",
      );

      await loadDashboard(true);

      setPeriodIds([]);
      setArrivalPeriodId("");
      setDeparturePeriodId("");
      setReason("");
      setNote("");
      setAbsenceModalOpen(false);

      showNotice(
        "success",
        "تم حفظ الغياب وتوليد الانتظار",
        "حُفظ سجل الغياب، وتم تحليل حصص المعلم وإنشاء مرشحي البدلاء دون تعديل الجدول الأساسي.",
      );
    } catch (error) {
      showNotice(
        "error",
        "تعذر تسجيل الغياب",
        getErrorMessage(error),
      );
    }
  }

  async function assignCandidate(
    substitutionId: string,
    candidate: Candidate,
  ) {
    try {
      await postAction(
        {
          action: "ASSIGN_SUBSTITUTE",
          data: {
            substitutionId,
            substituteTeacherId:
              candidate.teacherId,
          },
        },
        `assign:${substitutionId}`,
      );

      await loadDashboard(true);

      showNotice(
        "success",
        "تم إسناد المعلم البديل",
        `أُسندت الحصة إلى ${candidate.teacherName} وحُفظ التكليف كسجل فعلي.`,
      );
    } catch (error) {
      showNotice(
        "error",
        "تعذر إسناد البديل",
        getErrorMessage(error),
      );
    }
  }

  async function updateStatus(
    substitutionId: string,
    status:
      | "NOTIFIED"
      | "COMPLETED"
      | "CANCELED",
  ) {
    try {
      await postAction(
        {
          action: "UPDATE_SUBSTITUTION",
          data: {
            substitutionId,
            status,
          },
        },
        `status:${substitutionId}`,
      );

      await loadDashboard(true);

      showNotice(
        "success",
        "تم تحديث التكليف",
        status === "NOTIFIED"
          ? "تم تسجيل إشعار المعلم البديل."
          : status === "COMPLETED"
            ? "تم تسجيل تنفيذ حصة الانتظار."
            : "تم إلغاء التكليف.",
      );
    } catch (error) {
      showNotice(
        "error",
        "تعذر تحديث التكليف",
        getErrorMessage(error),
      );
    }
  }

  async function deleteAbsence(
    absenceId: string,
  ) {
    try {
      await postAction(
        {
          action: "DELETE_ABSENCE",
          absenceId,
        },
        `delete:${absenceId}`,
      );

      await loadDashboard(true);

      showNotice(
        "success",
        "تم حذف سجل الغياب",
        "حُذف السجل وحصص الانتظار التابعة له.",
      );
      setAbsencePendingDeletion(null);
    } catch (error) {
      setAbsencePendingDeletion(null);
      showNotice(
        "error",
        "تعذر حذف الغياب",
        getErrorMessage(error),
      );
    }
  }

  if (loading && !dashboard) {
    return (
      <div
        dir="rtl"
        className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm"
      >
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-sky-700" />
        <p className="mt-4 text-sm font-bold text-slate-500">
          جارٍ تحميل مركز التشغيل اليومي...
        </p>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <main
      dir="rtl"
      className="space-y-5 pb-10"
    >
      {/* =====================================================
          HEADER
          ===================================================== */}
      <section className="rounded-[26px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] font-black leading-none tracking-tight text-slate-950">
                التشغيل اليومي
              </h1>

              <span className="rounded-xl bg-sky-50 px-3 py-1.5 text-sm font-black text-sky-700">
                {dashboard.project.name}
              </span>

              <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-500">
                {dashboard.project.semester}
              </span>
            </div>

            <p className="mt-2 text-sm font-medium text-slate-500">
              الغياب والانتظار والبدلاء والمناوبات
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setAbsenceModalOpen(true)
              }
              className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-800"
            >
              + تسجيل غياب
            </button>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              disabled={loading}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loading
                ? "جارٍ التحديث..."
                : "تحديث"}
            </button>

            <a
              href={`/dashboard/timetable-v2/${projectId}`}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              الجدول
            </a>
          </div>
        </div>
      </section>

      {/* =====================================================
          METRICS
          ===================================================== */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="غياب اليوم"
          value={metrics.absences}
          hint="معلمون غائبون"
        />

        <MetricCard
          label="الحصص المتأثرة"
          value={metrics.affected}
          hint={`${metrics.covered} مغطاة`}
        />

        <MetricCard
          label="تحتاج إجراء"
          value={metrics.uncovered}
          hint={
            metrics.uncovered
              ? "بديل مطلوب"
              : "لا توجد حالات"
          }
          tone={
            metrics.uncovered
              ? "danger"
              : "success"
          }
        />

        <MetricCard
          label="تم التنفيذ"
          value={metrics.completed}
          hint="حصص مكتملة"
          tone="success"
        />
      </section>

      {/* =====================================================
          OPERATIONS WORKSPACE
          ===================================================== */}
      <TimetableOperationsSettingsPanels
        endpoint={endpoint}
        policy={dashboard.policy}
        teachers={dashboard.teachers}
        days={dashboard.days}
        periods={dashboard.periods}
        supervisionDuties={
          dashboard.supervisionDuties || []
        }
        activeSection={workspaceSection}
        onSectionChange={
          setWorkspaceSection
        }
        onReload={() =>
          loadDashboard(true)
        }
        onNotice={showNotice}
        absenceContent={
          <div className="space-y-5">
            {/* ===============================================
                DAY OVERVIEW
                =============================================== */}
            <section className="rounded-[24px] border border-slate-200 bg-slate-50/40 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black text-slate-950">
                      خطة اليوم
                    </h2>

                    <span className="text-sm font-bold text-slate-500">
                      {formatArabicDate(
                        absenceDate,
                      )}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    الحصص التي تحتاج متابعة أو إسناد بديل
                  </p>
                </div>

                {metrics.uncovered > 0 ? (
                  <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-700">
                    {metrics.uncovered} تحتاج بديل
                  </div>
                ) : metrics.affected > 0 ? (
                  <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                    التغطية مكتملة
                  </div>
                ) : (
                  <div className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-500">
                    لا توجد حالات
                  </div>
                )}
              </div>
            </section>

            {!selectedDateAbsences.length ? (
              <section className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-2xl font-black text-emerald-600">
                  ✓
                </div>

                <h3 className="mt-5 text-lg font-black text-slate-900">
                  اليوم بدون حالات غياب
                </h3>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  عند الحاجة استخدم زر تسجيل غياب في أعلى الصفحة.
                </p>
              </section>
            ) : (
              <div className="space-y-4">
                {selectedDateAbsences.map(
                  (absence) => (
                    <AbsenceCard
                      key={absence.id}
                      absence={absence}
                      periods={teachingPeriods}
                      workingKey={workingKey}
                      onAssign={
                        assignCandidate
                      }
                      onUpdateStatus={
                        updateStatus
                      }
                      onOpenPolicy={() =>
                        setWorkspaceSection(
                          "POLICY",
                        )
                      }
                      onDelete={async (
                        absenceId,
                      ) => {
                        setAbsencePendingDeletion(
                          absenceId,
                        );
                      }}
                    />
                  ),
                )}
              </div>
            )}

            {/* ===============================================
                HISTORY — COLLAPSED
                =============================================== */}
            <details className="group rounded-[22px] border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-slate-800">
                    سجل الغياب
                  </span>

                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                    {sortedAbsences.length}
                  </span>
                </div>

                <span className="text-xl font-black text-slate-300 transition group-open:rotate-45">
                  +
                </span>
              </summary>

              <div className="border-t border-slate-100 p-4">
                {!sortedAbsences.length ? (
                  <div className="py-8 text-center text-sm font-bold text-slate-400">
                    لا توجد سجلات
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {sortedAbsences
                      .slice(0, 12)
                      .map((absence) => {
                        const covered =
                          absence.substitutions.filter(
                            (item) =>
                              item.status ===
                                "ASSIGNED" ||
                              item.status ===
                                "NOTIFIED" ||
                              item.status ===
                                "COMPLETED" ||
                              item.status ===
                                "REASSIGNED",
                          ).length;

                        return (
                          <button
                            key={absence.id}
                            type="button"
                            onClick={() =>
                              handleDateChange(
                                dateOnly(
                                  absence.absenceDate,
                                ),
                              )
                            }
                            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right transition hover:border-sky-200 hover:bg-sky-50"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-900">
                                {absence.teacher.name}
                              </p>

                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {formatArabicDate(
                                  dateOnly(
                                    absence.absenceDate,
                                  ),
                                )}
                              </p>
                            </div>

                            <span className="shrink-0 text-xs font-black text-slate-500">
                              {covered}/
                              {
                                absence
                                  .substitutions
                                  .length
                              }
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </details>
          </div>
        }
      />

      {/* =====================================================
          ABSENCE POP CARD
          ===================================================== */}
      {absenceModalOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              setAbsenceModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="تسجيل غياب"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-slate-200 bg-white shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  تسجيل غياب
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  حدد المعلم ونوع الغياب فقط
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setAbsenceModalOpen(false)
                }
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl font-black text-slate-500 transition hover:bg-slate-200"
              >
                ×
              </button>
            </header>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="التاريخ">
                  <input
                    type="date"
                    value={absenceDate}
                    onChange={(event) =>
                      handleDateChange(
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="اليوم">
                  <select
                    value={dayId}
                    onChange={(event) =>
                      setDayId(
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    {dashboard.days.map(
                      (day) => (
                        <option
                          key={day.id}
                          value={day.id}
                        >
                          {day.label}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              </div>

              <Field label="المعلم">
                <select
                  value={teacherId}
                  onChange={(event) =>
                    setTeacherId(
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="">
                    اختر المعلم
                  </option>

                  {dashboard.teachers.map(
                    (teacher) => (
                      <option
                        key={teacher.id}
                        value={teacher.id}
                      >
                        {teacher.name}
                        {" — "}
                        {teacher.weeklyLoad}/
                        {teacher.maxWeeklyLoad}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="نوع الغياب">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: "FULL_DAY",
                      label: "يوم كامل",
                    },
                    {
                      value:
                        "SELECTED_PERIODS",
                      label: "حصص محددة",
                    },
                    {
                      value:
                        "LATE_ARRIVAL",
                      label: "حضور متأخر",
                    },
                    {
                      value:
                        "EARLY_DEPARTURE",
                      label: "انصراف مبكر",
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setAbsenceType(
                          option.value as AbsenceType,
                        );

                        setPeriodIds([]);
                        setArrivalPeriodId("");
                        setDeparturePeriodId("");
                      }}
                      className={
                        absenceType ===
                        option.value
                          ? "rounded-2xl border-2 border-sky-600 bg-sky-50 px-4 py-4 text-sm font-black text-sky-800"
                          : "rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-600 transition hover:border-sky-200"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>

              {absenceType ===
              "SELECTED_PERIODS" ? (
                <Field label="الحصص المتأثرة">
                  <div className="flex flex-wrap gap-2">
                    {teachingPeriods.map(
                      (period) => {
                        const selected =
                          periodIds.includes(
                            period.id,
                          );

                        return (
                          <button
                            key={period.id}
                            type="button"
                            onClick={() =>
                              togglePeriod(
                                period.id,
                              )
                            }
                            className={
                              selected
                                ? "rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white"
                                : "rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-600"
                            }
                          >
                            {period.label}
                          </button>
                        );
                      },
                    )}
                  </div>
                </Field>
              ) : null}

              {absenceType ===
              "LATE_ARRIVAL" ? (
                <Field label="يبدأ حضوره من">
                  <select
                    value={arrivalPeriodId}
                    onChange={(event) =>
                      setArrivalPeriodId(
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="">
                      اختر الحصة
                    </option>

                    {teachingPeriods.map(
                      (period) => (
                        <option
                          key={period.id}
                          value={period.id}
                        >
                          {period.label}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              ) : null}

              {absenceType ===
              "EARLY_DEPARTURE" ? (
                <Field label="آخر حصة قبل الانصراف">
                  <select
                    value={departurePeriodId}
                    onChange={(event) =>
                      setDeparturePeriodId(
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="">
                      اختر الحصة
                    </option>

                    {teachingPeriods.map(
                      (period) => (
                        <option
                          key={period.id}
                          value={period.id}
                        >
                          {period.label}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              ) : null}

              <details className="group rounded-2xl border border-slate-200 bg-slate-50/50">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-black text-slate-600">
                  <span>
                    سبب أو ملاحظة
                  </span>

                  <span className="text-xl text-slate-300 transition group-open:rotate-45">
                    +
                  </span>
                </summary>

                <div className="space-y-4 border-t border-slate-100 p-4">
                  <Field label="سبب الغياب">
                    <input
                      value={reason}
                      onChange={(event) =>
                        setReason(
                          event.target.value,
                        )
                      }
                      placeholder="اختياري"
                      className={inputClassName}
                    />
                  </Field>

                  <Field label="ملاحظات">
                    <textarea
                      value={note}
                      onChange={(event) =>
                        setNote(
                          event.target.value,
                        )
                      }
                      rows={3}
                      placeholder="اختياري"
                      className={`${inputClassName} resize-none`}
                    />
                  </Field>
                </div>
              </details>
            </div>

            <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-5">
              <button
                type="button"
                onClick={() =>
                  setAbsenceModalOpen(false)
                }
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() =>
                  void createAbsence()
                }
                disabled={
                  workingKey ===
                  "create-absence"
                }
                className="rounded-xl bg-sky-700 px-7 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-800 disabled:opacity-50"
              >
                {workingKey ===
                "create-absence"
                  ? "جارٍ التسجيل..."
                  : "تسجيل الغياب"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      <SmartFeedbackModal
        open={Boolean(notice)}
        type={notice?.tone || "info"}
        title={notice?.title || ""}
        description={notice?.message}
        primaryActionLabel="حسنًا"
        onOpenChange={(open) => {
          if (!open) {
            setNotice(null);
          }
        }}
      />

      <SmartActionModal
        open={Boolean(
          absencePendingDeletion,
        )}
        title="حذف سجل الغياب"
        description="سيتم حذف سجل الغياب وحصص الانتظار التابعة له فقط."
        variant="danger"
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        loading={Boolean(
          absencePendingDeletion &&
            workingKey ===
              `delete:${absencePendingDeletion}`,
        )}
        onConfirm={() => {
          if (
            absencePendingDeletion
          ) {
            void deleteAbsence(
              absencePendingDeletion,
            );
          }
        }}
        onClose={() =>
          setAbsencePendingDeletion(
            null,
          )
        }
      />
    </main>
  );
}

function AbsenceCard({
  absence,
  periods,
  workingKey,
  onAssign,
  onUpdateStatus,
  onOpenPolicy,
  onDelete,
}: {
  absence: Absence;
  periods: Period[];
  workingKey: string;
  onAssign: (
    substitutionId: string,
    candidate: Candidate,
  ) => Promise<void>;
  onUpdateStatus: (
    substitutionId: string,
    status:
      | "NOTIFIED"
      | "COMPLETED"
      | "CANCELED",
  ) => Promise<void>;

  onOpenPolicy:
    () => void;

  onDelete: (
    absenceId: string,
  ) => Promise<void>;
}) {
  const periodMap =
    new Map(
      periods.map((period) => [
        period.id,
        period.label,
      ]),
    );

  const covered =
    absence.substitutions.filter(
      (item) =>
        item.status === "ASSIGNED" ||
        item.status === "NOTIFIED" ||
        item.status === "COMPLETED" ||
        item.status === "REASSIGNED",
    ).length;

  const total =
    absence.substitutions.length;

  const remaining =
    Math.max(
      0,
      total - covered,
    );

  const progress =
    total
      ? Math.round(
          (covered / total) *
            100,
        )
      : 100;

  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <header className="px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-base font-black text-sky-700">
              {absence.teacher.name
                .trim()
                .charAt(0)}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="truncate text-lg font-black text-slate-950">
                  {absence.teacher.name}
                </h3>

                {remaining ? (
                  <span className="rounded-xl bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-700">
                    {remaining} متبقية
                  </span>
                ) : (
                  <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-black text-emerald-700">
                    مكتمل
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {absenceTypeLabel(
                  absence.absenceType,
                )}
                {" · "}
                {covered} من {total} مغطاة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(absence.reason ||
              absence.note) ? (
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-500">
                  التفاصيل
                </summary>

                <div className="absolute left-0 top-11 z-20 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium leading-7 text-slate-600 shadow-xl">
                  {absence.reason ? (
                    <p>
                      {absence.reason}
                    </p>
                  ) : null}

                  {absence.note ? (
                    <p className="mt-2">
                      {absence.note}
                    </p>
                  ) : null}
                </div>
              </details>
            ) : null}

            <button
              type="button"
              disabled={
                workingKey ===
                `delete:${absence.id}`
              }
              onClick={() =>
                void onDelete(
                  absence.id,
                )
              }
              className="rounded-xl px-3 py-2 text-sm font-black text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
            >
              حذف
            </button>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={
              remaining
                ? "h-full rounded-full bg-amber-400 transition-all"
                : "h-full rounded-full bg-emerald-500 transition-all"
            }
            style={{
              width:
                `${progress}%`,
            }}
          />
        </div>
      </header>

      <div className="border-t border-slate-100">
        {absence.substitutions.map(
          (substitution) => (
            <SubstitutionCard
              key={substitution.id}
              substitution={
                substitution
              }
              periodLabel={
                periodMap.get(
                  substitution.periodId,
                ) ||
                substitution.periodId
              }
              workingKey={
                workingKey
              }
              onAssign={
                onAssign
              }
              onUpdateStatus={
                onUpdateStatus
              }
              onOpenPolicy={
                onOpenPolicy
              }
            />
          ),
        )}
      </div>
    </article>
  );
}

function SubstitutionCard({
  substitution,
  periodLabel,
  workingKey,
  onAssign,
  onUpdateStatus,
  onOpenPolicy,
}: {
  substitution: Substitution;
  periodLabel: string;
  workingKey: string;
  onAssign: (
    substitutionId: string,
    candidate: Candidate,
  ) => Promise<void>;
  onUpdateStatus: (
    substitutionId: string,
    status:
      | "NOTIFIED"
      | "COMPLETED"
      | "CANCELED",
  ) => Promise<void>;

  onOpenPolicy:
    () => void;
}) {
  const candidates =
    Array.isArray(
      substitution.candidatesJson
        ?.candidates,
    )
      ? substitution
          .candidatesJson!
          .candidates!
      : [];

  const assigned =
    substitution.substituteTeacher;

  const bestCandidate =
    candidates[0];

  const excluded =
    Array.isArray(
      substitution.candidatesJson
        ?.excluded,
    )
      ? substitution
          .candidatesJson!
          .excluded!
      : [];

  const relaxationAdvice =
    !bestCandidate
      ? buildWaitingRelaxationAdvice(
          excluded,
        )
      : null;

  return (
    <div className="border-b border-slate-100 px-5 py-4 last:border-b-0">
      <div className="grid gap-4 xl:grid-cols-[minmax(300px,1fr)_minmax(340px,460px)] xl:items-center">
        {/* Session */}
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">
            {periodLabel}
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl bg-sky-50 px-3 py-1.5 text-sm font-black text-sky-700">
                {substitution.className}
              </span>

              <span className="truncate text-sm font-bold text-slate-600">
                {substitution.subjectName}
              </span>
            </div>
          </div>
        </div>

        {/* Action */}
        <div>
          {assigned ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-emerald-900">
                  {assigned.name}
                </p>

                <p className="mt-1 text-xs font-bold text-emerald-700">
                  {substitutionStatusLabel(
                    substitution.status,
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {substitution.status ===
                "ASSIGNED" ? (
                  <button
                    type="button"
                    disabled={
                      workingKey ===
                      `status:${substitution.id}`
                    }
                    onClick={() =>
                      void onUpdateStatus(
                        substitution.id,
                        "NOTIFIED",
                      )
                    }
                    className="rounded-xl bg-sky-700 px-3 py-2 text-xs font-black text-white disabled:opacity-40"
                  >
                    إشعار
                  </button>
                ) : null}

                {substitution.status ===
                  "ASSIGNED" ||
                substitution.status ===
                  "NOTIFIED" ? (
                  <button
                    type="button"
                    disabled={
                      workingKey ===
                      `status:${substitution.id}`
                    }
                    onClick={() =>
                      void onUpdateStatus(
                        substitution.id,
                        "COMPLETED",
                      )
                    }
                    className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-40"
                  >
                    تنفيذ
                  </button>
                ) : null}

                {substitution.status !==
                "COMPLETED" ? (
                  <button
                    type="button"
                    disabled={
                      workingKey ===
                      `status:${substitution.id}`
                    }
                    onClick={() =>
                      void onUpdateStatus(
                        substitution.id,
                        "CANCELED",
                      )
                    }
                    className="rounded-xl px-3 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-100 disabled:opacity-40"
                  >
                    إلغاء
                  </button>
                ) : null}
              </div>
            </div>
          ) : bestCandidate ? (
            <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-sky-600">
                      أفضل بديل
                    </span>

                    <span className="truncate text-sm font-black text-slate-950">
                      {bestCandidate.teacherName}
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-bold text-slate-500">
                    النصاب {bestCandidate.weeklyLoad}/
                    {bestCandidate.referenceLoad}
                    {" · "}
                    الترتيب #{bestCandidate.rank}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    workingKey ===
                    `assign:${substitution.id}`
                  }
                  onClick={() =>
                    void onAssign(
                      substitution.id,
                      bestCandidate,
                    )
                  }
                  className="shrink-0 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-sky-800 disabled:opacity-40"
                >
                  إسناد
                </button>
              </div>

              {candidates.length > 1 ? (
                <details className="group mt-3 border-t border-sky-100 pt-3">
                  <summary className="cursor-pointer list-none text-sm font-black text-sky-700">
                    مرشحون آخرون ({candidates.length - 1})
                  </summary>

                  <div className="mt-2 space-y-2">
                    {candidates
                      .slice(1, 6)
                      .map(
                        (candidate) => (
                          <button
                            key={
                              candidate.teacherId
                            }
                            type="button"
                            disabled={
                              workingKey ===
                              `assign:${substitution.id}`
                            }
                            onClick={() =>
                              void onAssign(
                                substitution.id,
                                candidate,
                              )
                            }
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right transition hover:border-sky-200 hover:bg-sky-50 disabled:opacity-40"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-800">
                                {candidate.teacherName}
                              </p>

                              <p className="mt-0.5 text-xs font-bold text-slate-400">
                                الترتيب #{candidate.rank}
                              </p>
                            </div>

                            <span className="shrink-0 text-sm font-black text-sky-700">
                              {candidate.score}
                            </span>
                          </button>
                        ),
                      )}
                  </div>
                </details>
              ) : null}
            </div>
          ) : (
            <WaitingRecoveryAdvisorCard
              advice={
                relaxationAdvice
              }
              onOpenPolicy={
                onOpenPolicy
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function WaitingRecoveryAdvisorCard({
  advice,
  onOpenPolicy,
}: {
  advice:
    ReturnType<
      typeof buildWaitingRelaxationAdvice
    > | null;

  onOpenPolicy:
    () => void;
}) {
  if (!advice) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-black text-slate-700">
          لا يوجد بديل متاح
        </p>
      </div>
    );
  }

  if (
    !advice.canRecover
  ) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-base font-black text-rose-600 shadow-sm">
            !
          </div>

          <div>
            <p className="text-sm font-black text-rose-800">
              لا يوجد تعديل آمن للضوابط
            </p>

            <p className="mt-1 text-xs font-bold leading-6 text-rose-600">
              {advice.summary}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const bestSingle =
    advice.singleChangeOptions[0];

  const bestPath =
    advice.bestTeacherPaths[0];

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-black text-amber-700 shadow-sm">
              اقتراح ذكي
            </span>

            <p className="text-sm font-black text-slate-950">
              {advice.title}
            </p>
          </div>

          {bestSingle ? (
            <div className="mt-3">
              <p className="text-sm font-black text-slate-800">
                {bestSingle.change.title}
              </p>

              <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                {bestSingle.change.description}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {bestSingle.teachers
                  .slice(0, 4)
                  .map(
                    (teacher) => (
                      <span
                        key={
                          teacher.teacherId
                        }
                        className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-slate-700"
                      >
                        {teacher.teacherName}
                      </span>
                    ),
                  )}

                {bestSingle.teachers.length >
                4 ? (
                  <span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-slate-500">
                    +
                    {bestSingle.teachers.length -
                      4}
                  </span>
                ) : null}
              </div>
            </div>
          ) : bestPath ? (
            <div className="mt-3">
              <p className="text-sm font-black text-slate-800">
                أقرب معلم:{" "}
                {bestPath.teacherName}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {bestPath.changes.map(
                  (change) => (
                    <span
                      key={
                        change.code
                      }
                      className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-amber-700"
                    >
                      {change.title}
                    </span>
                  ),
                )}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs font-bold text-slate-500">
              {advice.summary}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={
            onOpenPolicy
          }
          className="shrink-0 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-amber-800 transition hover:bg-amber-100"
        >
          فتح الضوابط
        </button>
      </div>

      {advice.bestTeacherPaths.length >
      1 ? (
        <details className="group mt-3 border-t border-amber-200 pt-3">
          <summary className="cursor-pointer list-none text-xs font-black text-amber-800">
            حلول أخرى ممكنة
          </summary>

          <div className="mt-3 space-y-2">
            {advice.bestTeacherPaths
              .slice(0, 4)
              .map(
                (path) => (
                  <div
                    key={
                      path.teacherId
                    }
                    className="rounded-xl bg-white px-3 py-2.5"
                  >
                    <p className="text-xs font-black text-slate-800">
                      {path.teacherName}
                    </p>

                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                      {path.changes
                        .map(
                          (change) =>
                            change.title,
                        )
                        .join(" + ")}
                    </p>
                  </div>
                ),
              )}
          </div>
        </details>
      ) : null}

      <p className="mt-3 text-[11px] font-bold leading-5 text-amber-700/80">
        الاقتراح تشخيصي فقط ولا يغيّر أي ضابط تلقائيًا.
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint: string;
  tone?:
    | "default"
    | "success"
    | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
        ? "text-rose-700"
        : "text-slate-950";

  const markerClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "danger"
        ? "bg-rose-500"
        : "bg-sky-600";

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <span
        className={`absolute right-0 top-0 h-full w-1 ${markerClass}`}
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-400">
            {hint}
          </p>
        </div>

        <p
          className={`text-[30px] font-black leading-none ${valueClass}`}
        >
          {value.toLocaleString("ar-SA")}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl shadow-sm">
        ◌
      </div>

      <h3 className="mt-4 font-black text-slate-950">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone:
    | "success"
    | "danger"
    | "warning"
    | "neutral";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "danger"
        ? "bg-rose-50 text-rose-700"
        : tone === "warning"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-xl px-3 py-1.5 text-xs font-black ${className}`}
    >
      {label}
    </span>
  );
}

function absenceTypeLabel(type: string) {
  const labels: Record<string, string> = {
    FULL_DAY: "غياب يوم كامل",
    SELECTED_PERIODS: "حصص محددة",
    LATE_ARRIVAL: "حضور متأخر",
    EARLY_DEPARTURE: "انصراف مبكر",
  };

  return labels[type] || type;
}

function substitutionStatusLabel(
  status: string,
) {
  const labels: Record<string, string> = {
    PENDING: "بانتظار المعالجة",
    SUGGESTED: "مرشحون جاهزون",
    ASSIGNED: "تم الإسناد",
    NOTIFIED: "تم الإشعار",
    COMPLETED: "تم التنفيذ",
    DECLINED: "تم الاعتذار",
    REASSIGNED: "أعيد الإسناد",
    CANCELED: "ملغي",
  };

  return labels[status] || status;
}

function substitutionStatusTone(
  status: string,
):
  | "success"
  | "danger"
  | "warning"
  | "neutral" {
  if (
    status === "COMPLETED" ||
    status === "NOTIFIED"
  ) {
    return "success";
  }

  if (
    status === "CANCELED" ||
    status === "DECLINED"
  ) {
    return "danger";
  }

  if (
    status === "SUGGESTED" ||
    status === "PENDING"
  ) {
    return "warning";
  }

  return "neutral";
}

function getTodayValue() {
  const now = new Date();
  const offset =
    now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - offset)
    .toISOString()
    .slice(0, 10);
}

function getDayIdFromDate(value: string) {
  if (!value) {
    return "sunday";
  }

  const date = new Date(`${value}T12:00:00`);

  return dayByWeekday[date.getDay()] ||
    "sunday";
}

function dateOnly(value: string) {
  return String(value).slice(0, 10);
}

function formatArabicDate(value: string) {
  const date = new Date(
    `${dateOnly(value)}T12:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ar-SA",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  ).format(date);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "حدث خطأ غير متوقع.";
}

const inputClassName = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100";
