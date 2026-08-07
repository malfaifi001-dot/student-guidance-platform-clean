"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  CATEGORY_META,
  getConstraintDefinition,
  getCatalogForBuilder,
  TONE_META,
  type ConstraintCategory,
} from "@/lib/timetable-v2/constraint-catalog";

import {
  effectiveSlotsForRule,
  previewRuleConflicts,
  slotKey,
  type AnalysisRule,
} from "@/lib/timetable-v2/constraint-analysis";

import {
  ConstraintTargetPicker,
} from "./constraint-target-picker";

import {
  ConstraintSlotPicker,
} from "./constraint-slot-picker";

import {
  constraintToAnalysisRule,
  draftToAnalysisRule,
  draftSlotCount,
} from "./helpers";

import type {
  ClassItem,
  Constraint,
  ConstraintDraft,
  DayItem,
  PeriodItem,
  Subject,
  Teacher,
  ToneHint,
} from "./types";

const TONE_PRIORITY: Record<
  Exclude<ToneHint, null>,
  number
> = {
  danger: 0,
  fixed: 1,
  preferred: 2,
  fairness: 3,
  custom: 4,
};

type Props = {
  days: DayItem[];
  periods: PeriodItem[];
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassItem[];
  existingConstraints: Constraint[];
  editingId: string | null;
  initial?: ConstraintDraft;
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: ConstraintDraft) => void;
};

function blankDraft(): ConstraintDraft {
  return {
    type: "TEACHER_UNAVAILABLE",
    strength: "HARD",
    notes: "",
    valueInt: null,
    weight: null,
    teacherIds: [],
    subjectIds: [],
    classIds: [],
    dayIds: [],
    periodIds: [],
    slots: [],
  };
}

function toggleInList(
  list: string[],
  id: string,
) {
  return list.includes(id)
    ? list.filter((item) => item !== id)
    : [...list, id];
}

export function ConstraintForm({
  days,
  periods,
  teachers,
  subjects,
  classes,
  existingConstraints,
  editingId,
  initial,
  busy,
  onCancel,
  onSave,
}: Props) {
  const catalog = useMemo(
    () => getCatalogForBuilder(),
    [],
  );

  const teachingPeriods = useMemo(
    () =>
      periods
        .filter((period) => !period.isBreak)
        .sort((a, b) => a.order - b.order),
    [periods],
  );

  const [draft, setDraft] = useState<ConstraintDraft>(() =>
    initial ?? blankDraft(),
  );

  const definition = getConstraintDefinition(draft.type);

  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(() =>
    new Set(
      (initial?.slots ?? []).map((slot) =>
        slotKey(slot.dayId, slot.periodId),
      ),
    ),
  );

  const isCustom = definition.type === "__CUSTOM__";

  const analysisOptions = useMemo(
    () => ({
      dayIds: days.map((day) => day.id),
      periodIds: teachingPeriods.map((period) => period.id),
    }),
    [days, teachingPeriods],
  );

  const cellHints = useMemo(() => {
    const map = new Map<string, ToneHint>();

    if (isCustom) {
      return map;
    }

    const hasTargets =
      draft.teacherIds.length > 0 ||
      draft.subjectIds.length > 0 ||
      draft.classIds.length > 0;

    for (const constraint of existingConstraints) {
      if (!constraint.isActive) {
        continue;
      }

      if (constraint.id === editingId) {
        continue;
      }

      const overlaps =
        !hasTargets ||
        (draft.teacherIds.length > 0 &&
          constraint.teachers.some((link) =>
            draft.teacherIds.includes(link.teacher.id),
          )) ||
        (draft.subjectIds.length > 0 &&
          constraint.subjects.some((link) =>
            draft.subjectIds.includes(link.subject.id),
          )) ||
        (draft.classIds.length > 0 &&
          constraint.classes.some((link) =>
            draft.classIds.includes(link.class.id),
          ));

      if (!overlaps) {
        continue;
      }

      const tone = getConstraintDefinition(constraint.type).tone;

      const slots = effectiveSlotsForRule(
        constraintToAnalysisRule(constraint),
        analysisOptions,
      );

      for (const slot of slots) {
        const key = slotKey(slot.dayId, slot.periodId);

        const existing = map.get(key);

        if (
          !existing ||
          TONE_PRIORITY[tone] < TONE_PRIORITY[existing]
        ) {
          map.set(key, tone);
        }
      }
    }

    return map;
  }, [
    draft.teacherIds,
    draft.subjectIds,
    draft.classIds,
    existingConstraints,
    editingId,
    isCustom,
    analysisOptions,
  ]);

  const existingRules = useMemo<AnalysisRule[]>(() => {
    const options = analysisOptions;

    return existingConstraints
      .filter(
        (constraint) =>
          constraint.isActive &&
          constraint.id !== editingId,
      )
      .map((constraint) => ({
        ...constraintToAnalysisRule(constraint),
        slots:
          constraint.slots.length > 0
            ? constraint.slots
            : effectiveSlotsForRule(
                constraintToAnalysisRule(constraint),
                options,
              ),
      }));
  }, [existingConstraints, editingId, analysisOptions]);

  const previewConflicts = useMemo(() => {
    if (isCustom) {
      return [];
    }

    const rule = draftToAnalysisRule(draft);

    const expanded = {
      ...rule,
      slots:
        rule.slots.length > 0
          ? rule.slots
          : effectiveSlotsForRule(rule, analysisOptions),
    };

    return previewRuleConflicts(
      expanded,
      existingRules,
      analysisOptions,
    );
  }, [draft, existingRules, analysisOptions, isCustom]);

  const errors = useMemo(() => {
    const list: string[] = [];

    for (const group of definition.requiredTargets) {
      const count =
        group === "teachers"
          ? draft.teacherIds.length
          : group === "subjects"
            ? draft.subjectIds.length
            : draft.classIds.length;

      if (count === 0) {
        list.push(
          group === "teachers"
            ? "اختر معلمًا واحدًا على الأقل."
            : group === "subjects"
              ? "اختر مادة واحدة على الأقل."
              : "اختر فصلًا واحدًا على الأقل.",
        );
      }
    }

    if (definition.schedule === "grid" && selectedSlots.size === 0) {
      list.push("حدد خلية واحدة على الأقل.");
    }

    if (
      (definition.schedule === "days" ||
        definition.schedule === "daysPeriods") &&
      draft.dayIds.length === 0
    ) {
      list.push("حدد يومًا واحدًا على الأقل.");
    }

    if (
      (definition.schedule === "periods" ||
        definition.schedule === "daysPeriods") &&
      draft.periodIds.length === 0
    ) {
      list.push("حدد حصة واحدة على الأقل.");
    }

    if (
      definition.valueKind === "count" &&
      (typeof draft.valueInt !== "number" ||
        !Number.isInteger(draft.valueInt) ||
        draft.valueInt < definition.valueMin ||
        draft.valueInt > definition.valueMax)
    ) {
      list.push(
        `القيمة يجب أن تكون بين ${definition.valueMin} و ${definition.valueMax}.`,
      );
    }

    if (
      draft.weight !== null &&
      (!Number.isFinite(draft.weight) ||
        draft.weight < 1 ||
        draft.weight > 100)
    ) {
      list.push("الوزن يجب أن يكون بين 1 و 100.");
    }

    return list;
  }, [draft, definition, selectedSlots.size]);

  const previewText = useMemo(() => {
    if (isCustom) {
      return "قيد مخصص لا يمكن معاينته من النموذج.";
    }

    const parts: string[] = [];

    parts.push(definition.label);

    if (draft.teacherIds.length > 0) {
      parts.push(
        `المعلم: ${teachers
          .filter((teacher) => draft.teacherIds.includes(teacher.id))
          .map((teacher) => teacher.name)
          .join("، ")}`,
      );
    }

    if (draft.subjectIds.length > 0) {
      parts.push(
        `المادة: ${subjects
          .filter((subject) => draft.subjectIds.includes(subject.id))
          .map((subject) => subject.name)
          .join("، ")}`,
      );
    }

    if (draft.classIds.length > 0) {
      parts.push(
        `الفصل: ${classes
          .filter((classItem) => draft.classIds.includes(classItem.id))
          .map((classItem) => classItem.name)
          .join("، ")}`,
      );
    }

    if (
      definition.valueKind === "count" &&
      typeof draft.valueInt === "number"
    ) {
      parts.push(`${definition.valueLabel}: ${draft.valueInt}`);
    }

    if (definition.schedule === "grid") {
      parts.push(`في ${selectedSlots.size} خلية`);
    } else if (definition.schedule === "days") {
      if (draft.dayIds.length > 0) {
        parts.push(
          `في الأيام: ${days
            .filter((day) => draft.dayIds.includes(day.id))
            .map((day) => day.label)
            .join("، ")}`,
        );
      }
    } else if (definition.schedule === "periods") {
      if (draft.periodIds.length > 0) {
        parts.push(
          `في الحصص: ${teachingPeriods
            .filter((period) => draft.periodIds.includes(period.id))
            .map((period) => period.label)
            .join("، ")}`,
        );
      }
    } else if (definition.schedule === "daysPeriods") {
      if (draft.dayIds.length > 0 && draft.periodIds.length > 0) {
        parts.push(
          `في ${draft.dayIds.length} يوم × ${draft.periodIds.length} حصة`,
        );
      }
    }

    if (draft.weight !== null) {
      parts.push(`بوزن ${draft.weight}%`);
    }

    return parts.join(" • ");
  }, [
    draft,
    definition,
    selectedSlots.size,
    days,
    teachingPeriods,
    teachers,
    subjects,
    classes,
    isCustom,
  ]);

  const selectType = (type: string) => {
    const nextDefinition = getConstraintDefinition(type);

    setDraft({
      ...blankDraft(),
      type,
      strength: nextDefinition.defaultStrength,
    });

    setSelectedSlots(new Set());
  };

  const toggleDay = (dayId: string) =>
    setDraft((current) => ({
      ...current,
      dayIds: toggleInList(current.dayIds, dayId),
    }));

  const togglePeriod = (periodId: string) =>
    setDraft((current) => ({
      ...current,
      periodIds: toggleInList(current.periodIds, periodId),
    }));

  const selectAllDays = () =>
    setDraft((current) => ({
      ...current,
      dayIds: days.map((day) => day.id),
    }));

  const selectAllPeriods = () =>
    setDraft((current) => ({
      ...current,
      periodIds: teachingPeriods.map((period) => period.id),
    }));

  const clearDays = () =>
    setDraft((current) => ({
      ...current,
      dayIds: [],
    }));

  const clearPeriods = () =>
    setDraft((current) => ({
      ...current,
      periodIds: [],
    }));

  const toggleSlot = (dayId: string, periodId: string) => {
    const key = slotKey(dayId, periodId);

    setSelectedSlots((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  const selectDay = (dayId: string) => {
    setSelectedSlots((current) => {
      const next = new Set(current);

      for (const period of teachingPeriods) {
        next.add(slotKey(dayId, period.id));
      }

      return next;
    });
  };

  const selectPeriod = (periodId: string) => {
    setSelectedSlots((current) => {
      const next = new Set(current);

      for (const day of days) {
        next.add(slotKey(day.id, periodId));
      }

      return next;
    });
  };

  const invertSlots = () => {
    setSelectedSlots((current) => {
      const next = new Set<string>();

      for (const day of days) {
        for (const period of teachingPeriods) {
          const key = slotKey(day.id, period.id);

          if (!current.has(key)) {
            next.add(key);
          }
        }
      }

      return next;
    });
  };

  const submit = () => {
    if (errors.length > 0 || busy) {
      return;
    }

    onSave({
      ...draft,
      strength:
        definition.allowedStrengths.length === 1
          ? definition.allowedStrengths[0]
          : draft.strength,
      valueInt:
        definition.valueKind === "count" ? draft.valueInt : null,
      weight:
        definition.hasWeight && draft.strength === "SOFT"
          ? draft.weight
          : null,
      slots:
        definition.schedule === "grid"
          ? [...selectedSlots].map((key) => {
              const [dayId, periodId] = key.split(":");

              return { dayId, periodId };
            })
          : [],
      dayIds:
        definition.schedule === "days" ||
        definition.schedule === "daysPeriods"
          ? draft.dayIds
          : [],
      periodIds:
        definition.schedule === "periods" ||
        definition.schedule === "daysPeriods"
          ? draft.periodIds
          : [],
    });
  };

  const grouped = useMemo(() => {
    const map = new Map<
      ConstraintCategory,
      typeof catalog
    >();

    for (const item of catalog) {
      const list = map.get(item.category) ?? [];

      list.push(item);

      map.set(item.category, list);
    }

    return map;
  }, [catalog]);

  const scheduleSlotCount = draftSlotCount(draft, analysisOptions);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">
              {editingId ? "تعديل القيد" : "إضافة قيد جديد"}
            </h2>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              اختر نوع القيد من الدليل ثم حدد الأهداف والأوقات.
            </p>
          </div>

          {editingId ? (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-black text-violet-700">
              يحفظ على نفس القيد
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {[...grouped.entries()].map(([category, items]) => (
            <div
              key={category}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="text-xs font-black text-teal-700">
                {CATEGORY_META[category].label}
              </div>

              <div className="mt-3 space-y-2">
                {items.map((item) => {
                  const active = draft.type === item.type;

                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => selectType(item.type)}
                      className={[
                        "w-full rounded-xl border p-3 text-right transition",
                        active
                          ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100"
                          : "border-slate-200 bg-white hover:border-teal-300",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-black text-slate-900">
                          {item.label}
                        </div>

                        <span
                          className={[
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black",
                            TONE_META[item.tone].chip,
                          ].join(" ")}
                        >
                          {TONE_META[item.tone].label}
                        </span>
                      </div>

                      <div className="mt-1 text-[11px] leading-5 text-slate-500">
                        {item.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">
              تفاصيل القيد
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {definition.hint}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {definition.allowedStrengths.length > 1 ? (
              <>
                {(["HARD", "SOFT"] as const).map((strength) => (
                  <button
                    key={strength}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        strength,
                      }))
                    }
                    className={[
                      "rounded-xl border px-4 py-2 text-xs font-black transition",
                      draft.strength === strength
                        ? strength === "HARD"
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {strength === "HARD" ? "إلزامي" : "تفضيل"}
                  </button>
                ))}
              </>
            ) : (
              <span
                className={[
                  "rounded-full px-3 py-1.5 text-[11px] font-black",
                  definition.defaultStrength === "HARD"
                    ? "bg-slate-100 text-slate-700"
                    : "bg-teal-100 text-teal-700",
                ].join(" ")}
              >
                {definition.defaultStrength === "HARD"
                  ? "إلزامي دائمًا"
                  : "تفضيل دائمًا"}
              </span>
            )}
          </div>
        </div>

        {!isCustom ? (
          <div className="mt-5 grid gap-4">
            {definition.targets.teachers ? (
              <ConstraintTargetPicker
                title="المعلمون"
                hint="اختيار متعدد"
                items={teachers.map((teacher) => ({
                  id: teacher.id,
                  name: teacher.name,
                }))}
                selected={draft.teacherIds}
                onToggle={(id) =>
                  setDraft((current) => ({
                    ...current,
                    teacherIds: toggleInList(current.teacherIds, id),
                  }))
                }
                onSelectAll={() =>
                  setDraft((current) => ({
                    ...current,
                    teacherIds: teachers.map((teacher) => teacher.id),
                  }))
                }
                onClear={() =>
                  setDraft((current) => ({
                    ...current,
                    teacherIds: [],
                  }))
                }
              />
            ) : null}

            {definition.targets.subjects ? (
              <ConstraintTargetPicker
                title="المواد"
                hint="اختيار متعدد"
                items={subjects.map((subject) => ({
                  id: subject.id,
                  name: subject.name,
                }))}
                selected={draft.subjectIds}
                onToggle={(id) =>
                  setDraft((current) => ({
                    ...current,
                    subjectIds: toggleInList(current.subjectIds, id),
                  }))
                }
                onSelectAll={() =>
                  setDraft((current) => ({
                    ...current,
                    subjectIds: subjects.map((subject) => subject.id),
                  }))
                }
                onClear={() =>
                  setDraft((current) => ({
                    ...current,
                    subjectIds: [],
                  }))
                }
              />
            ) : null}

            {definition.targets.classes ? (
              <ConstraintTargetPicker
                title="الفصول"
                hint="اختيار متعدد"
                items={classes.map((classItem) => ({
                  id: classItem.id,
                  name: classItem.name,
                }))}
                selected={draft.classIds}
                onToggle={(id) =>
                  setDraft((current) => ({
                    ...current,
                    classIds: toggleInList(current.classIds, id),
                  }))
                }
                onSelectAll={() =>
                  setDraft((current) => ({
                    ...current,
                    classIds: classes.map((classItem) => classItem.id),
                  }))
                }
                onClear={() =>
                  setDraft((current) => ({
                    ...current,
                    classIds: [],
                  }))
                }
              />
            ) : null}

            {definition.valueKind === "count" ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="block">
                  <span className="text-xs font-black text-slate-600">
                    {definition.valueLabel}
                  </span>

                  <div className="mt-2 flex max-w-40 items-center gap-2">
                    <input
                      type="number"
                      min={definition.valueMin}
                      max={definition.valueMax}
                      value={draft.valueInt ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          valueInt:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-black"
                    />

                    <span className="text-xs text-slate-500">
                      بين {definition.valueMin} و {definition.valueMax}
                    </span>
                  </div>
                </label>
              </div>
            ) : null}

            {definition.hasWeight &&
            draft.strength === "SOFT" ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="block">
                  <span className="text-xs font-black text-slate-600">
                    وزن التفضيل (٪)
                  </span>

                  <div className="mt-2 flex max-w-64 items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={draft.weight ?? 50}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          weight: Number(event.target.value),
                        }))
                      }
                      className="h-2 flex-1 accent-teal-600"
                    />

                    <span className="w-14 rounded-lg bg-teal-50 px-2 py-1 text-center text-sm font-black text-teal-700">
                      {draft.weight ?? 50}٪
                    </span>
                  </div>
                </label>
              </div>
            ) : null}

            {definition.schedule === "grid" ? (
              <ConstraintSlotPicker
                days={days}
                periods={teachingPeriods}
                selectedSlots={selectedSlots}
                onToggleSlot={toggleSlot}
                onSelectDay={selectDay}
                onSelectPeriod={selectPeriod}
                onInvert={invertSlots}
                cellHint={(dayId, periodId) =>
                  cellHints.get(slotKey(dayId, periodId)) ?? null
                }
              />
            ) : null}

            {definition.schedule === "days" ||
            definition.schedule === "daysPeriods" ? (
              <ConstraintTargetPicker
                title="الأيام"
                hint="اختيار متعدد — يسري القيد على كل حصص الأيام المحددة"
                items={days.map((day) => ({
                  id: day.id,
                  name: day.label,
                }))}
                selected={draft.dayIds}
                onToggle={toggleDay}
                onSelectAll={selectAllDays}
                onClear={clearDays}
              />
            ) : null}

            {definition.schedule === "periods" ||
            definition.schedule === "daysPeriods" ? (
              <ConstraintTargetPicker
                title="الحصص"
                hint="اختيار متعدد"
                items={teachingPeriods.map((period) => ({
                  id: period.id,
                  name: period.label,
                }))}
                selected={draft.periodIds}
                onToggle={togglePeriod}
                onSelectAll={selectAllPeriods}
                onClear={clearPeriods}
              />
            ) : null}

            {definition.schedule === "none" ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-500">
                هذا النوع لا يتطلب تحديد أوقات؛ يسري على كامل الجدول.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            هذا قيد بنوع غير معروف من نظام سابق. يمكنك تفعيله أو تعطيله أو
            حذفه من قائمة القيود، لكن لا يمكن تعديل تفاصيله من النموذج.
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-gradient-to-l from-teal-50 via-white to-cyan-50 p-5 shadow-sm lg:p-7">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <div className="text-xs font-black text-teal-700">
              معاينة القيد
            </div>

            <div className="mt-3 rounded-2xl border border-teal-200 bg-white p-4 text-sm font-bold leading-8 text-slate-800">
              {previewText}

              {definition.schedule !== "none" ? (
                <div className="mt-2 text-xs font-black text-slate-400">
                  = {scheduleSlotCount} خلية فعالة
                </div>
              ) : null}
            </div>

            {draft.notes ? (
              <div className="mt-3 rounded-xl bg-white/70 p-3 text-xs text-slate-500">
                ملاحظة: {draft.notes}
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-xs font-black text-teal-700">
              أثر القيد على القيود الحالية
            </div>

            {previewConflicts.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                لا توجد تعارضات متوقعة مع القيود الحالية.
              </div>
            ) : (
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {previewConflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className={[
                      "rounded-2xl border p-3 text-xs leading-6",
                      conflict.severity === "ERROR"
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : "border-amber-200 bg-amber-50 text-amber-800",
                    ].join(" ")}
                  >
                    <div className="font-black">
                      {conflict.title}
                    </div>

                    <div className="mt-1">
                      {conflict.description}
                    </div>

                    <div className="mt-1 text-[10px] opacity-70">
                      {conflict.slots.length} خلية متأثرة
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <textarea
          value={draft.notes}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
          placeholder="ملاحظة اختيارية توضح سبب القيد..."
          className="mt-5 h-20 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold"
        />

        {errors.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-xs font-black text-rose-700">
              أكمل البيانات التالية:
            </div>

            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-rose-700">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-12 rounded-xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={busy || errors.length > 0}
            className="h-12 rounded-xl bg-teal-700 px-8 text-sm font-black text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-40"
          >
            {busy
              ? "جار الحفظ..."
              : editingId
                ? "حفظ التعديلات"
                : "إضافة القيد"}
          </button>
        </div>
      </div>
    </div>
  );
}
