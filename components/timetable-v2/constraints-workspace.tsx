"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  CATEGORY_META,
  getConstraintDefinition,
} from "@/lib/timetable-v2/constraint-catalog";

import {
  analyzeConstraintConflicts,
  effectiveSlotsForRule,
  slotKey,
  summarizeConflicts,
  type ConstraintConflict,
  type AnalysisOptions,
} from "@/lib/timetable-v2/constraint-analysis";

import {
  ConstraintForm,
} from "./constraints/constraint-form";

import {
  ConstraintPopCard,
} from "./constraints/constraint-pop-card";

import {
  ConstraintReviewGrid,
} from "./constraints/constraint-review-grid";

import {
  ConstraintSummaryCard,
} from "./constraints/constraint-summary-card";

import {
  DayTimeEditor,
} from "./constraints/day-time-editor";

import {
  constraintToAnalysisRule,
  constraintToDraft,
} from "./constraints/helpers";

import type {
  ClassItem,
  Constraint,
  ConstraintDraft,
  DayItem,
  PeriodItem,
  Slot,
  Subject,
  Teacher,
} from "./constraints/types";

type Tab = "RULES" | "REVIEW" | "TIME";

type FormMode =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      constraint: Constraint;
    }
  | {
      mode: "copy";
      constraint: Constraint;
    };

type Props = {
  project: {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
  };

  days: DayItem[];
  initialPeriods: PeriodItem[];
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassItem[];
  initialConstraints: Constraint[];

  apiBasePath?: string;
  backPath?: string;
  nextPath?: string;
  stepLabel?: string;
};

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="text-xs font-bold text-slate-500">
        {label}
      </div>

      <div
        className={[
          "mt-1 text-2xl font-black",
          tone ?? "text-slate-950",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

export function TimetableV2ConstraintsWorkspace({
  project,
  days,
  initialPeriods,
  teachers,
  subjects,
  classes,
  initialConstraints,

  apiBasePath =
    "/api/dashboard/principal/timetable-v2",

  backPath =
    `/dashboard/timetable-v2/${project.id}`,

  nextPath,

  stepLabel =
    "القيود",
}: Props) {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("RULES");

  const [periods, setPeriods] = useState(initialPeriods);

  const [constraints, setConstraints] = useState(initialConstraints);

  const [formMode, setFormMode] = useState<FormMode | null>(null);

  const [reviewSlot, setReviewSlot] = useState<Slot | null>(null);

  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [severityFilter, setSeverityFilter] = useState<
    "ALL" | "ERROR" | "WARNING"
  >("ALL");

  const [search, setSearch] = useState("");

  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const teachingPeriods = useMemo(
    () =>
      periods
        .filter((period) => !period.isBreak)
        .sort((a, b) => a.order - b.order),
    [periods],
  );

  const analysisOptions = useMemo<AnalysisOptions>(
    () => ({
      dayIds: days.map((day) => day.id),
      periodIds: teachingPeriods.map((period) => period.id),
    }),
    [days, teachingPeriods],
  );

  const analysisRules = useMemo(
    () =>
      constraints
        .filter((constraint) => constraint.isActive)
        .map(constraintToAnalysisRule),
    [constraints],
  );

  const conflicts = useMemo(
    () => analyzeConstraintConflicts(analysisRules, analysisOptions),
    [analysisRules, analysisOptions],
  );

  const conflictSummary = useMemo(
    () => summarizeConflicts(conflicts),
    [conflicts],
  );

  const conflictMap = useMemo(() => {
    const map = new Map<string, ConstraintConflict[]>();

    for (const conflict of conflicts) {
      for (const slot of conflict.slots) {
        const key = slotKey(slot.dayId, slot.periodId);

        const list = map.get(key) ?? [];

        list.push(conflict);

        map.set(key, list);
      }
    }

    return map;
  }, [conflicts]);

  const constrainedSlots = useMemo(
    () =>
      new Set(
        constraints.flatMap((constraint) =>
          constraint.isActive
            ? effectiveSlotsForRule(
                constraintToAnalysisRule(constraint),
                analysisOptions,
              ).map((slot) =>
                slotKey(slot.dayId, slot.periodId),
              )
            : [],
        ),
      ).size,
    [constraints, analysisOptions],
  );

  const constraintsForSlot = (slot: Slot) =>
    constraints.filter((constraint) => {
      const touches =
        constraint.slots.some(
          (item) =>
            item.dayId === slot.dayId && item.periodId === slot.periodId,
        ) ||
        (constraint.days.some((day) => day.dayId === slot.dayId) &&
          constraint.periods.some(
            (period) => period.periodId === slot.periodId,
          ));

      return touches;
    });

  const conflictsForSlot = (slot: Slot) =>
    conflictMap.get(slotKey(slot.dayId, slot.periodId)) ?? [];

  const filteredConflicts = useMemo(
    () =>
      severityFilter === "ALL"
        ? conflicts
        : conflicts.filter(
            (conflict) => conflict.severity === severityFilter,
          ),
    [conflicts, severityFilter],
  );

  const filteredConstraints = useMemo(() => {
    const query = search.trim();

    return constraints.filter((constraint) => {
      if (categoryFilter !== "ALL") {
        if (getConstraintDefinition(constraint.type).category !== categoryFilter) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const definition = getConstraintDefinition(constraint.type);

      const haystack = [
        definition.label,
        definition.description,
        ...constraint.teachers.map((link) => link.teacher.name),
        ...constraint.subjects.map((link) => link.subject.name),
        ...constraint.classes.map((link) => link.class.name),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query.toLowerCase());
    });
  }, [constraints, categoryFilter, search]);

  const showMessage = (tone: "success" | "error" | "info", text: string) =>
    setMessage({ tone, text });

  const parseError = (data: { error?: string } | null, fallback: string) =>
    data?.error ?? fallback;

  const handleSave = async (draft: ConstraintDraft) => {
    if (busy) {
      return;
    }

    const payload: Record<string, unknown> = {
      type: draft.type,
      strength: draft.strength,
      title: null,
      valueInt: draft.valueInt,
      notes: draft.notes || null,
      teacherIds: draft.teacherIds,
      subjectIds: draft.subjectIds,
      classIds: draft.classIds,
      dayIds: draft.dayIds,
      periodIds: draft.periodIds,
      slots: draft.slots,
      configJson:
        draft.weight !== null ? { weight: draft.weight } : null,
    };

    const editing =
      formMode?.mode === "edit" ? formMode.constraint : null;

    try {
      setBusy(true);

      const response = await fetch(
        `/api/dashboard/principal/timetable-v2/projects/${project.id}/constraints`,
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(
            editing
              ? {
                  action: "UPDATE_CONSTRAINT",
                  constraintId: editing.id,
                  ...payload,
                }
              : {
                  action: "CREATE_CONSTRAINT",
                  ...payload,
                },
          ),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(parseError(data, "تعذر حفظ القيد."));
      }

      if (editing) {
        setConstraints((current) =>
          current.map((constraint) =>
            constraint.id === editing.id ? data.constraint : constraint,
          ),
        );

        showMessage("success", "تم تحديث القيد بنجاح.");
      } else {
        setConstraints((current) => [data.constraint, ...current]);

        showMessage("success", "تم إضافة القيد بنجاح.");
      }

      setFormMode(null);
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "تعذر حفظ القيد.",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (constraint: Constraint) => {
    try {
      setBusy(true);

      const response = await fetch(
        `/api/dashboard/principal/timetable-v2/projects/${project.id}/constraints`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            action: "TOGGLE_CONSTRAINT",
            constraintId: constraint.id,
            isActive: !constraint.isActive,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(parseError(data, "تعذر تحديث حالة القيد."));
      }

      setConstraints((current) =>
        current.map((item) =>
          item.id === constraint.id ? data.constraint : item,
        ),
      );

      showMessage(
        "success",
        data.constraint.isActive
          ? "تم تفعيل القيد."
          : "تم تعطيل القيد.",
      );
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "تعذر تحديث القيد.",
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteConstraint = async (constraintId: string) => {
    try {
      setBusy(true);

      const response = await fetch(
        `/api/dashboard/principal/timetable-v2/projects/${project.id}/constraints`,
        {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ constraintId }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(parseError(data, "تعذر حذف القيد."));
      }

      setConstraints((current) =>
        current.filter((constraint) => constraint.id !== constraintId),
      );

      showMessage("success", "تم حذف القيد.");

      if (reviewSlot) {
        setReviewSlot(null);
      }
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "تعذر حذف القيد.",
      );
    } finally {
      setBusy(false);
    }
  };

  const savePeriods = async () => {
    try {
      setBusy(true);

      const normalized = [...periods]
        .sort((a, b) => a.order - b.order)
        .map((period, index) => ({
          ...period,
          order: index + 1,
        }));

      const response = await fetch(
        `/api/dashboard/principal/timetable-v2/projects/${project.id}/constraints`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            action: "SAVE_PERIODS",
            periods: normalized,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(parseError(data, "تعذر حفظ أوقات اليوم."));
      }

      setPeriods(normalized);

      showMessage("success", "تم حفظ أوقات اليوم.");
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "تعذر حفظ الأوقات.",
      );
    } finally {
      setBusy(false);
    }
  };

  const activeCount = constraints.filter((item) => item.isActive).length;

  const hardCount = constraints.filter(
    (item) => item.strength === "HARD",
  ).length;

  const softCount = constraints.filter(
    (item) => item.strength === "SOFT",
  ).length;

  const reviewSlotConstraints = reviewSlot
    ? constraintsForSlot(reviewSlot)
    : [];

  const reviewSlotConflicts = reviewSlot
    ? conflictsForSlot(reviewSlot)
    : [];

  const formInitial =
    formMode?.mode === "edit" || formMode?.mode === "copy"
      ? constraintToDraft(formMode.constraint)
      : undefined;

  const formEditingId =
    formMode?.mode === "edit" ? formMode.constraint.id : null;

  const formTitle =
    formMode?.mode === "edit"
      ? "تعديل قيد موجود"
      : formMode?.mode === "copy"
        ? "نسخ قيد إلى أيام أو حصص أخرى"
        : "إضافة قيد جديد";

  return (
    <div dir="rtl" className="mx-auto max-w-[1600px] space-y-5 pb-20">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-l from-teal-50 via-white to-cyan-50 p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-black text-teal-700">
              {stepLabel}
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              القيود والأوقات
            </h1>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              {project.name}
              {" • "}
              حدد الواقع المدرسي بصريًا قبل إنشاء الجدول.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(backPath)
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
          >
            السابق
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <Metric label="إجمالي القيود" value={constraints.length} />

          <Metric label="نشط" value={activeCount} />

          <Metric
            label="إلزامي"
            value={hardCount}
          />

          <Metric label="تفضيلات" value={softCount} />

          <Metric
            label="خلايا مقيدة"
            value={constrainedSlots}
          />

          <Metric
            label="تعارضات إلزامية"
            value={conflictSummary.errors}
            tone={conflictSummary.errors > 0 ? "text-rose-600" : undefined}
          />

          <Metric
            label="تحذيرات"
            value={conflictSummary.warnings}
            tone={
              conflictSummary.warnings > 0 ? "text-amber-600" : undefined
            }
          />
        </div>
      </section>

      {message ? (
        <div
          className={[
            "rounded-2xl border px-5 py-4 text-sm font-bold",
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : message.tone === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-sky-200 bg-sky-50 text-sky-800",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-4">
          {(
            [
              ["RULES", "القيود", constraints.length],
              ["REVIEW", "مراجعة القيود", conflicts.length],
              ["TIME", "أوقات اليوم", null],
              ["FORM", formTitle, null],
            ] as const
          ).map(([value, label, badge]) => {
            const active =
              value === "FORM"
                ? formMode !== null
                : tab === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  if (value === "FORM") {
                    setFormMode({ mode: "create" });
                  } else {
                    setFormMode(null);
                    setTab(value);
                  }
                }}
                className={[
                  "h-12 rounded-2xl text-sm font-black transition",
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                <span className="inline-flex items-center gap-2">
                  {label}

                  {badge !== null ? (
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-black",
                        active
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-600",
                      ].join(" ")}
                    >
                      {badge}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {formMode ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">{formTitle}</h2>

            <button
              type="button"
              onClick={() => setFormMode(null)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
            >
              إغلاق النموذج
            </button>
          </div>

          <ConstraintForm
            key={
              formMode.mode === "edit"
                ? `edit-${formMode.constraint.id}`
                : formMode.mode === "copy"
                  ? `copy-${formMode.constraint.id}`
                  : "create"
            }
            days={days}
            periods={periods}
            teachers={teachers}
            subjects={subjects}
            classes={classes}
            existingConstraints={constraints}
            editingId={formEditingId}
            initial={formInitial}
            busy={busy}
            onCancel={() => setFormMode(null)}
            onSave={handleSave}
          />
        </section>
      ) : null}

      {!formMode && tab === "RULES" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">قائمة القيود</h2>

              <p className="mt-1 text-xs text-slate-500">
                {activeCount} نشط من أصل {constraints.length} قيد.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="بحث في القيود..."
                className="h-11 w-56 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
              />

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black"
              >
                <option value="ALL">كل الفئات</option>

                {Object.entries(CATEGORY_META)
                  .sort((a, b) => a[1].order - b[1].order)
                  .map(([category, meta]) => (
                    <option key={category} value={category}>
                      {meta.label}
                    </option>
                  ))}
              </select>

              <button
                type="button"
                onClick={() => setFormMode({ mode: "create" })}
                className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-teal-800"
              >
                + إضافة قيد
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {filteredConstraints.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <div className="text-sm font-black text-slate-700">
                  {constraints.length === 0
                    ? "لا توجد قيود بعد."
                    : "لا توجد قيود مطابقة للبحث."}
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  أضف قيدك الأول من الدليل لتحديد الواقع المدرسي.
                </div>

                <button
                  type="button"
                  onClick={() => setFormMode({ mode: "create" })}
                  className="mt-4 h-11 rounded-xl bg-teal-700 px-6 text-sm font-black text-white transition hover:bg-teal-800"
                >
                  إضافة قيد
                </button>
              </div>
            ) : (
              filteredConstraints.map((constraint) => (
                <ConstraintSummaryCard
                  key={constraint.id}
                  constraint={constraint}
                  days={days}
                  periods={periods}
                  editing={false}
                  busy={busy}
                  onEdit={() =>
                    setFormMode({ mode: "edit", constraint })
                  }
                  onToggleActive={() => toggleActive(constraint)}
                  onDelete={() => deleteConstraint(constraint.id)}
                  onCopy={() =>
                    setFormMode({ mode: "copy", constraint })
                  }
                />
              ))
            )}
          </div>
        </section>
      ) : null}

      {!formMode && tab === "REVIEW" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
          <div>
            <h2 className="text-xl font-black">خريطة القيود</h2>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              اضغط أي خلية لعرض القيود المؤثرة عليها وتعديلها.
              الخلايا ذات الإطار الأحمر تعارض إلزامي، والبرتقالي تحذير.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {(
              [
                ["ALL", "الكل", conflicts.length],
                ["ERROR", "تعارضات إلزامية", conflictSummary.errors],
                ["WARNING", "تحذيرات", conflictSummary.warnings],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSeverityFilter(value)}
                className={[
                  "rounded-xl border px-4 py-2 text-xs font-black transition",
                  severityFilter === value
                    ? value === "ERROR"
                      ? "border-rose-400 bg-rose-50 text-rose-700"
                      : value === "WARNING"
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                ].join(" ")}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {filteredConflicts.length > 0 ? (
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {filteredConflicts.map((conflict, index) => (
                <div
                  key={index}
                  className={[
                    "flex flex-wrap items-start justify-between gap-3 rounded-2xl border p-4",
                    conflict.severity === "ERROR"
                      ? "border-rose-200 bg-rose-50"
                      : "border-amber-200 bg-amber-50",
                  ].join(" ")}
                >
                  <div className="min-w-0 flex-1 text-xs leading-6">
                    <div
                      className={[
                        "font-black",
                        conflict.severity === "ERROR"
                          ? "text-rose-800"
                          : "text-amber-800",
                      ].join(" ")}
                    >
                      {conflict.title}
                    </div>

                    <div
                      className={[
                        "mt-1",
                        conflict.severity === "ERROR"
                          ? "text-rose-700"
                          : "text-amber-700",
                      ].join(" ")}
                    >
                      {conflict.description}
                    </div>

                    <div className="mt-1 text-[10px] opacity-70">
                      {conflict.slots.length} خلية متأثرة • {" "}
                      {conflict.constraintIds.length} قيد
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const first = conflict.slots[0];

                      if (first) {
                        setReviewSlot(first);
                      }
                    }}
                    className="h-9 shrink-0 rounded-xl border border-white bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                  >
                    عرض
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-5">
            <ConstraintReviewGrid
              days={days}
              periods={teachingPeriods}
              constraints={constraints}
              conflicts={conflicts}
              onCellClick={setReviewSlot}
            />
          </div>
        </section>
      ) : null}

      {!formMode && tab === "TIME" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
          <div>
            <h2 className="text-xl font-black">
              توقيت اليوم الدراسي
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              ولّد أوقات الحصص بسرعة، أضف الفسحات، وعدّل أي توقيت يدويًا.
            </p>
          </div>

          <div className="mt-6">
            <DayTimeEditor
              periods={periods}
              constraints={constraints}
              busy={busy}
              onChange={setPeriods}
              onSave={savePeriods}
              onReviewConstraints={() => setTab("RULES")}
            />
          </div>
        </section>
      ) : null}

      {nextPath && !formMode ? (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(backPath)
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            السابق
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(nextPath)
            }
            className="h-11 rounded-xl bg-[#3478B8] px-6 text-sm font-black text-white transition hover:bg-[#2D6BA5]"
          >
            التالي: التحقق
          </button>
        </div>
      ) : null}

      {reviewSlot ? (
        <ConstraintPopCard
          dayLabel={
            days.find((day) => day.id === reviewSlot.dayId)?.label ?? ""
          }
          periodLabel={
            teachingPeriods.find((period) => period.id === reviewSlot.periodId)
              ?.label ?? ""
          }
          constraints={reviewSlotConstraints}
          conflicts={reviewSlotConflicts}
          busy={busy}
          onClose={() => setReviewSlot(null)}
          onEdit={(constraint) => {
            setReviewSlot(null);
            setFormMode({ mode: "edit", constraint });
          }}
          onToggleActive={toggleActive}
          onDelete={deleteConstraint}
          onCopy={(constraint) => {
            setReviewSlot(null);
            setFormMode({ mode: "copy", constraint });
          }}
        />
      ) : null}
    </div>
  );
}
