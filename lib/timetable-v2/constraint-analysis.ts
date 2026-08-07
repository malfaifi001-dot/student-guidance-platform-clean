export type AnalysisSlot = {
  dayId: string;
  periodId: string;
};

export type AnalysisRule = {
  id: string;
  type: string;
  strength: string;
  valueInt: number | null;
  teacherIds: string[];
  subjectIds: string[];
  classIds: string[];
  dayIds: string[];
  periodIds: string[];
  slots: AnalysisSlot[];
};

export type AnalysisOptions = {
  dayIds: string[];
  periodIds: string[];
};

export type ConstraintConflictSeverity =
  | "ERROR"
  | "WARNING";

export type ConstraintConflict = {
  severity: ConstraintConflictSeverity;
  code: string;
  title: string;
  description: string;
  constraintIds: string[];
  slots: AnalysisSlot[];
};

export function slotKey(
  dayId: string,
  periodId: string,
) {
  return `${dayId}:${periodId}`;
}

export function effectiveSlotsForRule(
  rule: AnalysisRule,
  options: AnalysisOptions,
): AnalysisSlot[] {
  const slots = rule.slots ?? [];

  if (slots.length > 0) {
    return [
      ...slots,
    ];
  }

  const dayIds = rule.dayIds ?? [];
  const periodIds = rule.periodIds ?? [];

  if (
    dayIds.length > 0 &&
    periodIds.length > 0
  ) {
    return dayIds.flatMap((dayId) =>
      periodIds.map((periodId) => ({
        dayId,
        periodId,
      })),
    );
  }

  if (dayIds.length > 0) {
    return dayIds.flatMap((dayId) =>
      options.periodIds.map((periodId) => ({
        dayId,
        periodId,
      })),
    );
  }

  if (periodIds.length > 0) {
    return options.dayIds.flatMap((dayId) =>
      periodIds.map((periodId) => ({
        dayId,
        periodId,
      })),
    );
  }

  return [];
}

function hasCommon(
  a: string[] = [],
  b: string[] = [],
) {
  if (a.length === 0 || b.length === 0) {
    return false;
  }

  const set = new Set(a);

  return b.some((item) => set.has(item));
}

function overlap(
  a: AnalysisSlot[],
  b: AnalysisSlot[],
): AnalysisSlot[] {
  const map = new Map<string, AnalysisSlot>();

  for (const slot of a) {
    map.set(slotKey(slot.dayId, slot.periodId), slot);
  }

  const shared: AnalysisSlot[] = [];

  for (const slot of b) {
    if (map.has(slotKey(slot.dayId, slot.periodId))) {
      shared.push(slot);
    }
  }

  return shared;
}

function isFixedType(type: string) {
  return (
    type === "FIXED_ASSIGNMENT" ||
    type === "FIXED_SUBJECT_DAY" ||
    type === "FIXED_TEACHER_SLOT"
  );
}

function signature(rule: AnalysisRule) {
  const days = [...(rule.dayIds ?? [])].sort();
  const periods = [...(rule.periodIds ?? [])].sort();
  const slots = [...(rule.slots ?? [])]
    .map((slot) => slotKey(slot.dayId, slot.periodId))
    .sort();

  return [
    rule.type,
    [...(rule.teacherIds ?? [])].sort().join(","),
    [...(rule.subjectIds ?? [])].sort().join(","),
    [...(rule.classIds ?? [])].sort().join(","),
    days.join(","),
    periods.join(","),
    slots.join(","),
  ].join("|");
}

function uniqueSlots(slots: AnalysisSlot[]) {
  const map = new Map<string, AnalysisSlot>();

  for (const slot of slots) {
    map.set(slotKey(slot.dayId, slot.periodId), slot);
  }

  return [...map.values()];
}

export function analyzeConstraintConflicts(
  rules: AnalysisRule[],
  options: AnalysisOptions,
): ConstraintConflict[] {
  const active = rules.filter((rule) => rule.type);

  const effective = new Map<string, AnalysisSlot[]>();

  for (const rule of active) {
    effective.set(
      rule.id,
      uniqueSlots(effectiveSlotsForRule(rule, options)),
    );
  }

  const conflicts: ConstraintConflict[] = [];

  const addConflict = (
    severity: ConstraintConflictSeverity,
    code: string,
    title: string,
    description: string,
    constraintIds: string[],
    slots: AnalysisSlot[],
  ) => {
    conflicts.push({
      severity,
      code,
      title,
      description,
      constraintIds: [...new Set(constraintIds)],
      slots: uniqueSlots(slots).slice(0, 200),
    });
  };

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];

      const shared = overlap(
        effective.get(a.id) ?? [],
        effective.get(b.id) ?? [],
      );

      if (shared.length === 0) {
        continue;
      }

      if (
        a.type === "TEACHER_UNAVAILABLE" &&
        isFixedType(b.type) &&
        hasCommon(a.teacherIds, b.teacherIds)
      ) {
        addConflict(
          "ERROR",
          "CONFLICT_FIXED_UNAVAILABLE",
          "إسناد مثبت في وقت منع للمعلم",
          "قيد منع متقاطع مع قيد تثبيت لنفس المعلم في نفس الخلايا.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        b.type === "TEACHER_UNAVAILABLE" &&
        isFixedType(a.type) &&
        hasCommon(a.teacherIds, b.teacherIds)
      ) {
        addConflict(
          "ERROR",
          "CONFLICT_FIXED_UNAVAILABLE",
          "إسناد مثبت في وقت منع للمعلم",
          "قيد تثبيت متقاطع مع قيد منع لنفس المعلم في نفس الخلايا.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        a.type === "TEACHER_DAY_OFF" &&
        isFixedType(b.type) &&
        hasCommon(a.teacherIds, b.teacherIds)
      ) {
        addConflict(
          "ERROR",
          "CONFLICT_FIXED_DAY_OFF",
          "إسناد مثبت في يوم راحة للمعلم",
          "قيد يوم راحة متقاطع مع قيد تثبيت لنفس المعلم.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        b.type === "TEACHER_DAY_OFF" &&
        isFixedType(a.type) &&
        hasCommon(a.teacherIds, b.teacherIds)
      ) {
        addConflict(
          "ERROR",
          "CONFLICT_FIXED_DAY_OFF",
          "إسناد مثبت في يوم راحة للمعلم",
          "قيد تثبيت متقاطع مع قيد يوم راحة لنفس المعلم.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        a.type === "SUBJECT_BLOCKED" &&
        isFixedType(b.type) &&
        hasCommon(a.subjectIds, b.subjectIds)
      ) {
        addConflict(
          "ERROR",
          "CONFLICT_FIXED_SUBJECT_BLOCKED",
          "إسناد مثبت في وقت ممنوع للمادة",
          "قيد منع للمادة متقاطع مع قيد تثبيت لنفس المادة.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        b.type === "SUBJECT_BLOCKED" &&
        isFixedType(a.type) &&
        hasCommon(a.subjectIds, b.subjectIds)
      ) {
        addConflict(
          "ERROR",
          "CONFLICT_FIXED_SUBJECT_BLOCKED",
          "إسناد مثبت في وقت ممنوع للمادة",
          "قيد تثبيت متقاطع مع قيد منع للمادة.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        a.type === "CLASS_BLOCKED_SLOT" &&
        isFixedType(b.type) &&
        hasCommon(a.classIds, b.classIds)
      ) {
        addConflict(
          "ERROR",
          "CONFLICT_FIXED_CLASS_BLOCKED",
          "إسناد مثبت في وقت ممنوع للفصل",
          "قيد منع للفصل متقاطع مع قيد تثبيت لنفس الفصل.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        b.type === "CLASS_BLOCKED_SLOT" &&
        isFixedType(a.type) &&
        hasCommon(a.classIds, b.classIds)
      ) {
        addConflict(
          "ERROR",
          "CONFLICT_FIXED_CLASS_BLOCKED",
          "إسناد مثبت في وقت ممنوع للفصل",
          "قيد تثبيت متقاطع مع قيد منع للفصل.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        a.type === "SCHOOL_BLOCKED_SLOT" &&
        isFixedType(b.type)
      ) {
        addConflict(
          "ERROR",
          "CONFLICT_SCHOOL_BLOCKED_FIXED",
          "إسناد مثبت في وقت معطل على مستوى المدرسة",
          "قيد تثبيت يقع ضمن خلية معطلة على مستوى المدرسة.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        b.type === "SCHOOL_BLOCKED_SLOT" &&
        isFixedType(a.type)
      ) {
        addConflict(
          "ERROR",
          "CONFLICT_SCHOOL_BLOCKED_FIXED",
          "إسناد مثبت في وقت معطل على مستوى المدرسة",
          "قيد تثبيت يقع ضمن خلية معطلة على مستوى المدرسة.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        a.type === "TEACHER_UNAVAILABLE" &&
        b.type === "TEACHER_PREFERRED" &&
        hasCommon(a.teacherIds, b.teacherIds)
      ) {
        addConflict(
          "WARNING",
          "CONFLICT_PREFERRED_UNAVAILABLE",
          "معلم مفضل وممنوع في نفس الوقت",
          "القيدان يتعارضان في التفضيل والمنع لنفس المعلم.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        b.type === "TEACHER_UNAVAILABLE" &&
        a.type === "TEACHER_PREFERRED" &&
        hasCommon(a.teacherIds, b.teacherIds)
      ) {
        addConflict(
          "WARNING",
          "CONFLICT_PREFERRED_UNAVAILABLE",
          "معلم مفضل وممنوع في نفس الوقت",
          "القيدان يتعارضان في التفضيل والمنع لنفس المعلم.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        a.type === "SUBJECT_BLOCKED" &&
        b.type === "SUBJECT_PREFERRED" &&
        hasCommon(a.subjectIds, b.subjectIds)
      ) {
        addConflict(
          "WARNING",
          "CONFLICT_PREFERRED_BLOCKED_SUBJECT",
          "مادة مفضلة وممنوعة في نفس الوقت",
          "القيدان يتعارضان في التفضيل والمنع لنفس المادة.",
          [a.id, b.id],
          shared,
        );
        continue;
      }

      if (
        b.type === "SUBJECT_BLOCKED" &&
        a.type === "SUBJECT_PREFERRED" &&
        hasCommon(a.subjectIds, b.subjectIds)
      ) {
        addConflict(
          "WARNING",
          "CONFLICT_PREFERRED_BLOCKED_SUBJECT",
          "مادة مفضلة وممنوعة في نفس الوقت",
          "القيدان يتعارضان في التفضيل والمنع لنفس المادة.",
          [a.id, b.id],
          shared,
        );
        continue;
      }
    }
  }

  const groups = new Map<string, AnalysisRule[]>();

  for (const rule of active) {
    const key = signature(rule);

    const group = groups.get(key) ?? [];

    group.push(rule);

    groups.set(key, group);
  }

  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }

    const first = group[0];

    const duplicates = group.slice(1);

    addConflict(
      "WARNING",
      "DUPLICATE_RULE",
      "قيد مكرر",
      `يوجد ${group.length} قيود متطابقة في النوع والأهداف والأوقات.`,
      [
        first.id,
        ...duplicates.map((rule) => rule.id),
      ],
      effective.get(first.id) ?? [],
    );
  }

  for (const rule of active) {
    if (
      rule.type !== "TEACHER_MAX_DAILY" ||
      typeof rule.valueInt !== "number" ||
      rule.valueInt < 1
    ) {
      continue;
    }

    const fixed = active.filter(
      (item) =>
        isFixedType(item.type) &&
        hasCommon(
          item.teacherIds,
          rule.teacherIds,
        ),
    );

    if (fixed.length === 0) {
      continue;
    }

    const byDay = new Map<string, AnalysisSlot[]>();

    for (const item of fixed) {
      for (const slot of effective.get(item.id) ?? []) {
        const list = byDay.get(slot.dayId) ?? [];

        list.push(slot);

        byDay.set(slot.dayId, list);
      }
    }

    for (const [dayId, slots] of byDay) {
      if (slots.length <= rule.valueInt) {
        continue;
      }

      addConflict(
        "WARNING",
        "OVERFIXED_TEACHER_DAILY",
        "تثبيتات تتجاوز الحد اليومي للمعلم",
        `للمعلم ${slots.length} خلية مثبتة في يوم واحد بينما الحد الأقصى ${rule.valueInt}.`,
        [
          rule.id,
          ...fixed.map((item) => item.id),
        ],
        uniqueSlots(slots).slice(0, 200),
      );
    }
  }

  return conflicts.sort((a, b) => {
    const severityOrder =
      a.severity === b.severity
        ? 0
        : a.severity === "ERROR"
          ? -1
          : 1;

    if (severityOrder !== 0) {
      return severityOrder;
    }

    const codeOrder = a.code.localeCompare(b.code);

    if (codeOrder !== 0) {
      return codeOrder;
    }

    const aKey =
      a.constraintIds.join(",");

    const bKey =
      b.constraintIds.join(",");

    return aKey.localeCompare(bKey);
  });
}

export function previewRuleConflicts(
  rule: AnalysisRule,
  existingRules: AnalysisRule[],
  options: AnalysisOptions,
): ConstraintConflict[] {
  const conflicts = analyzeConstraintConflicts(
    [...existingRules, rule],
    options,
  );

  return conflicts.filter((conflict) =>
    conflict.constraintIds.includes(rule.id),
  );
}

export function summarizeConflicts(
  conflicts: ConstraintConflict[],
) {
  const errors = conflicts.filter(
    (conflict) =>
      conflict.severity === "ERROR",
  ).length;

  const warnings = conflicts.filter(
    (conflict) =>
      conflict.severity === "WARNING",
  ).length;

  const slots = new Set(
    conflicts.flatMap((conflict) =>
      conflict.slots.map((slot) =>
        slotKey(slot.dayId, slot.periodId),
      ),
    ),
  ).size;

  return {
    errors,
    warnings,
    affectedSlots: slots,
  };
}
