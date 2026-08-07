import {
  effectiveSlotsForRule,
  type AnalysisRule,
  type AnalysisOptions,
} from "@/lib/timetable-v2/constraint-analysis";

import type {
  Constraint,
  ConstraintDraft,
} from "./types";

export function constraintToDraft(
  constraint: Constraint,
): ConstraintDraft {
  const config = constraint.configJson as
    | Record<string, unknown>
    | null
    | undefined;

  let weight: number | null = null;

  if (
    config &&
    typeof config === "object" &&
    typeof config.weight === "number"
  ) {
    weight = config.weight;
  }

  return {
    type: constraint.type,
    strength:
      constraint.strength === "SOFT"
        ? "SOFT"
        : "HARD",
    notes: constraint.notes ?? "",
    valueInt: constraint.valueInt,
    weight,
    teacherIds:
      constraint.teachers.map(
        (link) => link.teacher.id,
      ),
    subjectIds:
      constraint.subjects.map(
        (link) => link.subject.id,
      ),
    classIds:
      constraint.classes.map(
        (link) => link.class.id,
      ),
    dayIds:
      constraint.days.map(
        (day) => day.dayId,
      ),
    periodIds:
      constraint.periods.map(
        (period) => period.periodId,
      ),
    slots: constraint.slots.map((slot) => ({
      dayId: slot.dayId,
      periodId: slot.periodId,
    })),
  };
}

export function constraintToAnalysisRule(
  constraint: Constraint,
): AnalysisRule {
  return {
    id: constraint.id,
    type: constraint.type,
    strength: constraint.strength,
    valueInt: constraint.valueInt,
    teacherIds:
      constraint.teachers.map(
        (link) => link.teacher.id,
      ),
    subjectIds:
      constraint.subjects.map(
        (link) => link.subject.id,
      ),
    classIds:
      constraint.classes.map(
        (link) => link.class.id,
      ),
    dayIds:
      constraint.days.map(
        (day) => day.dayId,
      ),
    periodIds:
      constraint.periods.map(
        (period) => period.periodId,
      ),
    slots: constraint.slots.map((slot) => ({
      dayId: slot.dayId,
      periodId: slot.periodId,
    })),
  };
}

export function draftToAnalysisRule(
  draft: ConstraintDraft,
): AnalysisRule {
  return {
    id: "__PREVIEW__",
    type: draft.type,
    strength: draft.strength,
    valueInt: draft.valueInt,
    teacherIds: draft.teacherIds,
    subjectIds: draft.subjectIds,
    classIds: draft.classIds,
    dayIds: draft.dayIds,
    periodIds: draft.periodIds,
    slots: draft.slots,
  };
}

export function draftSlotCount(
  draft: ConstraintDraft,
  options: AnalysisOptions,
) {
  return new Set(
    effectiveSlotsForRule(
      draftToAnalysisRule(draft),
      options,
    ).map((slot) => `${slot.dayId}:${slot.periodId}`),
  ).size;
}
