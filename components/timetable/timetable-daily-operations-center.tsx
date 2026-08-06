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
} from "@/components/timetable/timetable-operations-settings-panels";
import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";

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

export function TimetableDailyOperationsCenter({
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

  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const endpoint =
    `/api/dashboard/principal/timetable/projects/${projectId}/operations`;

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
    } catch (error) {
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
      className="space-y-6 pb-10"
    >
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-sky-600 p-8 text-white shadow-xl">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-black text-cyan-100">
              التشغيل اليومي للجدول
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              الغياب والانتظار والمناوبات
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-sky-100">
              سجّل غياب المعلم، استخرج الحصص
              المتأثرة، ثم اعتمد البدلاء مع
              المحافظة على الجدول المدرسي الأساسي.
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-white/15 px-3 py-1.5">
                {dashboard.project.name}
              </span>

              <span className="rounded-full bg-white/15 px-3 py-1.5">
                {dashboard.project.academicYear}
              </span>

              <span className="rounded-full bg-white/15 px-3 py-1.5">
                {dashboard.project.semester}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`/dashboard/principal/timetable/${projectId}`}
              className="rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20"
            >
              العودة إلى إعداد الجدول
            </a>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              disabled={loading}
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-sky-50 disabled:opacity-60"
            >
              {loading
                ? "جارٍ التحديث..."
                : "تحديث البيانات"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="غياب اليوم"
          value={metrics.absences}
          hint="سجلات محفوظة"
        />

        <MetricCard
          label="الحصص المتأثرة"
          value={metrics.affected}
          hint="تم استخراجها من الجدول"
        />

        <MetricCard
          label="تمت التغطية"
          value={metrics.covered}
          hint="بديل مسند"
          tone="success"
        />

        <MetricCard
          label="بدون بديل"
          value={metrics.uncovered}
          hint="تحتاج قرارًا"
          tone={
            metrics.uncovered
              ? "danger"
              : "default"
          }
        />

        <MetricCard
          label="تم التنفيذ"
          value={metrics.completed}
          hint="حصص مكتملة"
          tone="success"
        />
      </section>

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
          <>
      <section className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="h-fit rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-sky-700">
                الخطوة الأولى
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                تسجيل غياب معلم
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                الحفظ ينشئ سجل غياب فعليًا
                ويولد مرشحي الانتظار مباشرة.
              </p>
            </div>

            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-xl">
              ◷
            </div>
          </div>

          <div className="mt-6 space-y-4">
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

            <Field label="اليوم الدراسي">
              <select
                value={dayId}
                onChange={(event) =>
                  setDayId(event.target.value)
                }
                className={inputClassName}
              >
                {dashboard.days.map((day) => (
                  <option
                    key={day.id}
                    value={day.id}
                  >
                    {day.label}
                  </option>
                ))}
              </select>
            </Field>

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
              <select
                value={absenceType}
                onChange={(event) => {
                  setAbsenceType(
                    event.target
                      .value as AbsenceType,
                  );

                  setPeriodIds([]);
                  setArrivalPeriodId("");
                  setDeparturePeriodId("");
                }}
                className={inputClassName}
              >
                <option value="FULL_DAY">
                  غياب يوم كامل
                </option>

                <option value="SELECTED_PERIODS">
                  حصص محددة
                </option>

                <option value="LATE_ARRIVAL">
                  حضور متأخر
                </option>

                <option value="EARLY_DEPARTURE">
                  انصراف مبكر
                </option>
              </select>
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
                              ? "rounded-full bg-sky-700 px-3 py-2 text-xs font-black text-white"
                              : "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600"
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

            <Field label="سبب الغياب">
              <input
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                placeholder="اختياري"
                className={inputClassName}
              />
            </Field>

            <Field label="ملاحظات">
              <textarea
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                placeholder="أي تفاصيل تساعد في التشغيل اليومي"
                rows={3}
                className={`${inputClassName} resize-none`}
              />
            </Field>

            <button
              type="button"
              onClick={() =>
                void createAbsence()
              }
              disabled={
                workingKey ===
                "create-absence"
              }
              className="w-full rounded-2xl bg-sky-700 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {workingKey ===
              "create-absence"
                ? "جارٍ الحفظ وتوليد الانتظار..."
                : "حفظ الغياب وتوليد الانتظار"}
            </button>

            <p className="text-center text-xs font-bold leading-5 text-slate-400">
              لا يتم تغيير الجدول المدرسي
              الأساسي؛ يُنشأ جدول تشغيل يومي
              مستقل.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black text-sky-700">
                  الخطوتان الثانية والثالثة
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  خطة الانتظار اليومية
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {formatArabicDate(
                    absenceDate,
                  )}
                </p>
              </div>

              <StatusBadge
                label={
                  metrics.uncovered
                    ? `${metrics.uncovered} حصة تحتاج بديلًا`
                    : metrics.affected
                      ? "جميع الحصص مغطاة"
                      : "لا توجد حصص متأثرة"
                }
                tone={
                  metrics.uncovered
                    ? "danger"
                    : metrics.affected
                      ? "success"
                      : "neutral"
                }
              />
            </div>

            {!selectedDateAbsences.length ? (
              <EmptyState
                title="لا توجد حالات غياب في هذا التاريخ"
                description="سجّل غياب معلم من النموذج، وسيظهر هنا سجل الغياب وحصص الانتظار المقترحة."
              />
            ) : (
              <div className="mt-6 space-y-5">
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
                      onDelete={deleteAbsence}
                    />
                  ),
                )}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-black text-sky-700">
                السجل التشغيلي
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                آخر سجلات الغياب
              </h2>
            </div>

            {!sortedAbsences.length ? (
              <EmptyState
                title="السجل فارغ"
                description="ستظهر هنا سجلات الغياب المحفوظة مع عدد الحصص وحالة التغطية."
              />
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {sortedAbsences
                  .slice(0, 10)
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
                        className="rounded-[1.75rem] border border-sky-200 bg-sky-50/35 p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-950">
                              {
                                absence.teacher
                                  .name
                              }
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {formatArabicDate(
                                dateOnly(
                                  absence.absenceDate,
                                ),
                              )}
                            </p>
                          </div>

                          <StatusBadge
                            label={absenceTypeLabel(
                              absence.absenceType,
                            )}
                            tone="neutral"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                          <span className="rounded-full bg-white px-3 py-1.5 text-slate-600">
                            {
                              absence
                                .substitutions
                                .length
                            }{" "}
                            حصة
                          </span>

                          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                            {covered} مغطاة
                          </span>

                          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                            {absence.substitutions
                              .length -
                              covered}{" "}
                            متبقية
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </section>
        </div>
      </section>
          </>
        }
      />
      <SmartFeedbackModal
        open={Boolean(notice)}
        type={notice?.tone || "info"}
        title={notice?.title || ""}
        description={notice?.message}
        primaryActionLabel="حسنًا"
        onOpenChange={(open) => {
          if (!open) setNotice(null);
        }}
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
  onDelete: (
    absenceId: string,
  ) => Promise<void>;
}) {
  const periodMap = new Map(
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

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50/70">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-lg font-black text-sky-700">
            {absence.teacher.name
              .trim()
              .charAt(0)}
          </div>

          <div>
            <h3 className="font-black text-slate-950">
              {absence.teacher.name}
            </h3>

            <p className="mt-1 text-xs font-bold text-slate-500">
              {absenceTypeLabel(
                absence.absenceType,
              )}
              {" · "}
              {formatArabicDate(dateOnly(absence.absenceDate))}
              {" · "}
              {covered} من{" "}
              {absence.substitutions.length} مغطاة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={
              covered ===
              absence.substitutions.length
                ? "مكتمل التغطية"
                : "قيد المعالجة"
            }
            tone={
              covered ===
              absence.substitutions.length
                ? "success"
                : "warning"
            }
          />

          <button
            type="button"
            disabled={
              workingKey ===
              `delete:${absence.id}`
            }
            onClick={() =>
              void onDelete(absence.id)
            }
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-50"
          >
            حذف السجل
          </button>
        </div>
      </header>

      {absence.reason || absence.note ? (
        <div className="border-b border-slate-200 px-4 py-3 text-xs font-bold leading-6 text-slate-600">
          {absence.reason ? (
            <p>
              <span className="text-slate-950">
                السبب:
              </span>{" "}
              {absence.reason}
            </p>
          ) : null}

          {absence.note ? (
            <p>
              <span className="text-slate-950">
                الملاحظة:
              </span>{" "}
              {absence.note}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3 p-4">
        {absence.substitutions.map(
          (substitution) => (
            <SubstitutionCard
              key={substitution.id}
              substitution={substitution}
              periodLabel={
                periodMap.get(
                  substitution.periodId,
                ) ||
                substitution.periodId
              }
              workingKey={workingKey}
              onAssign={onAssign}
              onUpdateStatus={
                onUpdateStatus
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
}) {
  const candidates = Array.isArray(
    substitution.candidatesJson
      ?.candidates,
  )
    ? substitution.candidatesJson!
        .candidates!
    : [];

  const assigned =
    substitution.substituteTeacher;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
              {periodLabel}
            </span>

            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700">
              {substitution.className}
            </span>

            <span className="text-xs font-bold text-slate-500">
              {substitution.subjectName}
            </span>
          </div>

          {assigned ? (
            <div className="mt-3">
              <p className="text-sm font-black text-emerald-700">
                البديل: {assigned.name}
              </p>

              {substitution.candidateRank ? (
                <p className="mt-1 text-xs font-black text-sky-700">
                  ترتيب المرشح: #{substitution.candidateRank}
                </p>
              ) : null}

              {substitution.selectionReason ? (
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  {
                    substitution.selectionReason
                  }
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm font-black text-amber-700">
              لم يُعتمد معلم بديل بعد
            </p>
          )}
        </div>

        <StatusBadge
          label={substitutionStatusLabel(
            substitution.status,
          )}
          tone={substitutionStatusTone(
            substitution.status,
          )}
        />
      </div>

      {!assigned ? (
        candidates.length ? (
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {candidates
              .slice(0, 6)
              .map((candidate) => (
                <button
                  key={candidate.teacherId}
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
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-3 text-right transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        #{candidate.rank}{" "}
                        {candidate.teacherName}
                      </p>

                      <p className="mt-1 text-[11px] font-bold text-slate-500">
                        النصاب{" "}
                        {candidate.weeklyLoad}/
                        {
                          candidate.referenceLoad
                        }
                        {" · "}
                        انتظار الأسبوع{" "}
                        {
                          candidate.weeklyExecuted
                        }
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-sky-700 shadow-sm">
                      {candidate.score}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-[11px] font-bold leading-5 text-slate-500">
                    {candidate.reasonLabels
                      .join("، ") ||
                      "متاح في هذه الحصة"}
                  </p>

                  <p className="mt-2 text-[11px] font-black text-sky-700 opacity-0 transition group-hover:opacity-100">
                    اضغط لاعتماد البديل
                  </p>
                </button>
              ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-black text-rose-700">
            لم يعثر النظام على بديل يحقق
            ضوابط الانتظار الحالية.
          </p>
        )
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
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
              className="rounded-full bg-sky-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
            >
              تسجيل إشعار المعلم
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
              className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
            >
              تسجيل التنفيذ
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
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 disabled:opacity-50"
            >
              إلغاء التكليف
            </button>
          ) : null}
        </div>
      )}
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

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-black ${valueClass}`}
      >
        {value.toLocaleString("ar-SA")}
      </p>

      <p className="mt-2 text-xs font-bold text-slate-500">
        {hint}
      </p>
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
      <span className="mb-2 block text-xs font-black text-slate-700">
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
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${className}`}
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

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100";
