import type {
  GenerationAssignment,
  GenerationConstraint,
  GenerationProblem,
} from "../generation/generation-domain";

import type {
  TimetableFeasibilityIssue,
  TimetableFeasibilityMetric,
  TimetableFeasibilityReport,
} from "./feasibility-types";

type SlotRef = {
  dayId: string;
  periodId: string;
  periodOrder: number;
};

type ConstraintScope = {
  teacherId?: string;
  classId?: string;
  subjectId?: string;
};

type AvailabilityContext = {
  problem: GenerationProblem;

  slots: SlotRef[];

  periodsByDay:
    Map<string, SlotRef[]>;

  hardConstraints:
    GenerationConstraint[];
};

function canonicalConstraintType(
  type: string,
): string {
  switch (type) {
    case "TEACHER_UNAVAILABLE_SLOT":
      return "TEACHER_UNAVAILABLE";

    case "TEACHER_DAILY_LIMIT":
    case "TEACHER_MAX_DAILY_PERIODS":
      return "TEACHER_MAX_DAILY";

    case "TEACHER_CONSECUTIVE_LIMIT":
    case "TEACHER_MAX_CONSECUTIVE_PERIODS":
      return "TEACHER_MAX_CONSECUTIVE";

    case "SUBJECT_FORBIDDEN_SLOT":
      return "SUBJECT_BLOCKED";

    case "SUBJECT_DAILY_LIMIT":
    case "SUBJECT_MAX_DAILY_OCCURRENCES":
      return "SUBJECT_MAX_DAILY";

    default:
      return type;
  }
}

function isHardConstraint(
  constraint: GenerationConstraint,
): boolean {
  return (
    constraint.strength ??
    "HARD"
  ) === "HARD";
}

function includesOrGlobal(
  values:
    string[] | null | undefined,

  value:
    string | undefined,
): boolean {
  if (
    !values ||
    values.length === 0
  ) {
    return true;
  }

  if (!value) {
    return false;
  }

  return values.includes(
    value,
  );
}

function specificallyIncludes(
  values:
    string[] | null | undefined,

  value:
    string | undefined,
): boolean {
  return Boolean(
    value &&
    values &&
    values.includes(value),
  );
}

function constraintTargetsScope(
  constraint: GenerationConstraint,
  scope: ConstraintScope,
): boolean {
  if (
    constraint.teacherIds?.length &&
    !specificallyIncludes(
      constraint.teacherIds,
      scope.teacherId,
    )
  ) {
    return false;
  }

  if (
    constraint.classIds?.length &&
    !specificallyIncludes(
      constraint.classIds,
      scope.classId,
    )
  ) {
    return false;
  }

  if (
    constraint.subjectIds?.length &&
    !specificallyIncludes(
      constraint.subjectIds,
      scope.subjectId,
    )
  ) {
    return false;
  }

  return true;
}

function constraintMatchesSlot(
  constraint: GenerationConstraint,
  slot: SlotRef,
): boolean {
  if (
    constraint.slots &&
    constraint.slots.length > 0
  ) {
    return constraint.slots.some(
      (item) =>
        item.dayId === slot.dayId &&
        item.periodId === slot.periodId,
    );
  }

  const hasDays =
    Boolean(
      constraint.dayIds?.length,
    );

  const hasPeriods =
    Boolean(
      constraint.periodIds?.length,
    );

  if (
    !hasDays &&
    !hasPeriods
  ) {
    return false;
  }

  const dayMatches =
    !hasDays ||
    constraint.dayIds.includes(
      slot.dayId,
    );

  const periodMatches =
    !hasPeriods ||
    constraint.periodIds.includes(
      slot.periodId,
    );

  return (
    dayMatches &&
    periodMatches
  );
}

function isSlotStructurallyBlocked(
  context: AvailabilityContext,
  slot: SlotRef,
  scope: ConstraintScope,
): boolean {
  for (
    const constraint of
    context.hardConstraints
  ) {
    const type =
      canonicalConstraintType(
        constraint.type,
      );

    if (
      type ===
      "SCHOOL_BLOCKED_DAY"
    ) {
      if (
        includesOrGlobal(
          constraint.dayIds,
          slot.dayId,
        )
      ) {
        return true;
      }

      continue;
    }

    if (
      type ===
      "SCHOOL_BLOCKED_SLOT"
    ) {
      if (
        constraintMatchesSlot(
          constraint,
          slot,
        )
      ) {
        return true;
      }

      continue;
    }

    if (
      type ===
      "TEACHER_DAY_OFF"
    ) {
      if (
        scope.teacherId &&
        specificallyIncludes(
          constraint.teacherIds,
          scope.teacherId,
        ) &&
        specificallyIncludes(
          constraint.dayIds,
          slot.dayId,
        )
      ) {
        return true;
      }

      continue;
    }

    if (
      type ===
      "TEACHER_UNAVAILABLE"
    ) {
      if (
        scope.teacherId &&
        specificallyIncludes(
          constraint.teacherIds,
          scope.teacherId,
        ) &&
        constraintMatchesSlot(
          constraint,
          slot,
        )
      ) {
        return true;
      }

      continue;
    }

    if (
      type ===
      "CLASS_BLOCKED_SLOT"
    ) {
      if (
        scope.classId &&
        specificallyIncludes(
          constraint.classIds,
          scope.classId,
        ) &&
        constraintMatchesSlot(
          constraint,
          slot,
        )
      ) {
        return true;
      }

      continue;
    }

    if (
      type ===
      "SUBJECT_BLOCKED"
    ) {
      if (
        scope.subjectId &&
        specificallyIncludes(
          constraint.subjectIds,
          scope.subjectId,
        ) &&
        includesOrGlobal(
          constraint.classIds,
          scope.classId,
        ) &&
        constraintMatchesSlot(
          constraint,
          slot,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function availableSlotsForScope(
  context: AvailabilityContext,
  scope: ConstraintScope,
): SlotRef[] {
  return context.slots.filter(
    (slot) =>
      !isSlotStructurallyBlocked(
        context,
        slot,
        scope,
      ),
  );
}

function availableSlotsForScopeOnDay(
  context: AvailabilityContext,
  scope: ConstraintScope,
  dayId: string,
): SlotRef[] {
  return (
    context.periodsByDay.get(
      dayId,
    ) ?? []
  ).filter(
    (slot) =>
      !isSlotStructurallyBlocked(
        context,
        slot,
        scope,
      ),
  );
}

function minPositiveLimit(
  constraints:
    GenerationConstraint[],

  type:
    string,

  scope:
    ConstraintScope,
): {
  value: number;
  constraintId: string;
} | null {
  let result:
    {
      value: number;
      constraintId: string;
    } | null =
    null;

  for (
    const constraint of
    constraints
  ) {
    if (
      canonicalConstraintType(
        constraint.type,
      ) !== type
    ) {
      continue;
    }

    if (
      !constraintTargetsScope(
        constraint,
        scope,
      )
    ) {
      continue;
    }

    if (
      typeof constraint.valueInt !==
        "number" ||
      constraint.valueInt <= 0
    ) {
      continue;
    }

    if (
      !result ||
      constraint.valueInt <
        result.value
    ) {
      result = {
        value:
          constraint.valueInt,

        constraintId:
          constraint.id,
      };
    }
  }

  return result;
}

function maxOccupancyWithConsecutiveLimit(
  availableOrders:
    number[],

  maxConsecutive:
    number,
): number {
  if (
    availableOrders.length === 0
  ) {
    return 0;
  }

  if (
    maxConsecutive <= 0
  ) {
    return 0;
  }

  const maxOrder =
    Math.max(
      ...availableOrders,
    );

  const available =
    new Set(
      availableOrders,
    );

  const dp:
    number[][] =
    Array.from(
      {
        length:
          maxOrder + 1,
      },
      () =>
        Array(
          maxConsecutive + 1,
        ).fill(
          Number.NEGATIVE_INFINITY,
        ),
    );

  dp[0][0] = 0;

  for (
    let order = 1;
    order <= maxOrder;
    order += 1
  ) {
    for (
      let run = 0;
      run <= maxConsecutive;
      run += 1
    ) {
      const previous =
        dp[order - 1][run];

      if (
        !Number.isFinite(
          previous,
        )
      ) {
        continue;
      }

      dp[order][0] =
        Math.max(
          dp[order][0],
          previous,
        );

      if (
        available.has(
          order,
        ) &&
        run < maxConsecutive
      ) {
        dp[order][run + 1] =
          Math.max(
            dp[order][run + 1],
            previous + 1,
          );
      }
    }
  }

  return Math.max(
    0,
    ...dp[maxOrder],
  );
}

function countConsecutiveStarts(
  available:
    SlotRef[],

  length:
    number,
): number {
  if (
    length <= 1
  ) {
    return available.length;
  }

  const grouped =
    new Map<
      string,
      Set<number>
    >();

  for (
    const slot of
    available
  ) {
    const orders =
      grouped.get(
        slot.dayId,
      ) ??
      new Set<number>();

    orders.add(
      slot.periodOrder,
    );

    grouped.set(
      slot.dayId,
      orders,
    );
  }

  let starts =
    0;

  for (
    const orders of
    grouped.values()
  ) {
    for (
      const order of
      orders
    ) {
      let valid =
        true;

      for (
        let offset = 1;
        offset < length;
        offset += 1
      ) {
        if (
          !orders.has(
            order + offset,
          )
        ) {
          valid = false;
          break;
        }
      }

      if (valid) {
        starts += 1;
      }
    }
  }

  return starts;
}

function addIssue(
  issues:
    TimetableFeasibilityIssue[],

  issue:
    TimetableFeasibilityIssue,
): void {
  const key =
    JSON.stringify({
      code:
        issue.code,

      entityId:
        issue.entityId,

      evidence:
        issue.evidence,
    });

  const duplicate =
    issues.some(
      (existing) =>
        JSON.stringify({
          code:
            existing.code,

          entityId:
            existing.entityId,

          evidence:
            existing.evidence,
        }) === key,
    );

  if (!duplicate) {
    issues.push(
      issue,
    );
  }
}

function sumAssignmentDemand(
  assignments:
    GenerationAssignment[],
): number {
  return assignments.reduce(
    (
      total,
      assignment,
    ) =>
      total +
      assignment.assignedLessons,
    0,
  );
}

export function analyzeTimetableV2Feasibility(
  problem: GenerationProblem,
): TimetableFeasibilityReport {
  const startedAt =
    Date.now();

  const issues:
    TimetableFeasibilityIssue[] =
    [];

  const metrics:
    TimetableFeasibilityMetric[] =
    [];

  const slots:
    SlotRef[] =
    problem.days.flatMap(
      (day) =>
        problem.periods.map(
          (period) => ({
            dayId:
              day.id,

            periodId:
              period.id,

            periodOrder:
              period.order,
          }),
        ),
    );

  const periodsByDay =
    new Map<
      string,
      SlotRef[]
    >();

  for (
    const day of
    problem.days
  ) {
    periodsByDay.set(
      day.id,
      slots.filter(
        (slot) =>
          slot.dayId ===
          day.id,
      ),
    );
  }

  const hardConstraints =
    problem.constraints.filter(
      isHardConstraint,
    );

  const context:
    AvailabilityContext =
    {
      problem,
      slots,
      periodsByDay,
      hardConstraints,
    };

  const teacherIds =
    new Set(
      problem.teachers.map(
        (teacher) =>
          teacher.id,
      ),
    );

  const teacherById =
    new Map(
      problem.teachers.map(
        (teacher) => [
          teacher.id,
          teacher,
        ],
      ),
    );

  const classIds =
    new Set(
      problem.classes.map(
        (classItem) =>
          classItem.id,
      ),
    );

  const classById =
    new Map(
      problem.classes.map(
        (classItem) => [
          classItem.id,
          classItem,
        ],
      ),
    );

  const subjectIds =
    new Set(
      problem.subjects.map(
        (subject) =>
          subject.id,
      ),
    );

  const subjectById =
    new Map(
      problem.subjects.map(
        (subject) => [
          subject.id,
          subject,
        ],
      ),
    );

  const assignmentIds =
    new Set<string>();

  const requiredSessions =
    sumAssignmentDemand(
      problem.assignments,
    );

  metrics.push({
    key:
      "requiredSessions",

    value:
      requiredSessions,
  });

  metrics.push({
    key:
      "schoolSlotCount",

    value:
      slots.length,
  });

  // ==========================================================
  // Problem structure.
  // ==========================================================

  if (
    problem.days.length === 0
  ) {
    addIssue(
      issues,
      {
        code:
          "NO_SCHOOL_DAYS",

        severity:
          "ERROR",

        category:
          "PROBLEM",

        proven:
          true,

        message:
          "لا توجد أيام دراسية في المشكلة.",

        entityId:
          problem.projectId,

        evidence:
          {},
      },
    );
  }

  if (
    problem.periods.length === 0
  ) {
    addIssue(
      issues,
      {
        code:
          "NO_SCHOOL_PERIODS",

        severity:
          "ERROR",

        category:
          "PROBLEM",

        proven:
          true,

        message:
          "لا توجد حصص يومية في المشكلة.",

        entityId:
          problem.projectId,

        evidence:
          {},
      },
    );
  }

  const duplicateDayIds =
    problem.days.filter(
      (
        day,
        index,
        items,
      ) =>
        items.findIndex(
          (other) =>
            other.id ===
            day.id,
        ) !== index,
    );

  if (
    duplicateDayIds.length >
    0
  ) {
    addIssue(
      issues,
      {
        code:
          "DUPLICATE_DAY_ID",

        severity:
          "ERROR",

        category:
          "PROBLEM",

        proven:
          true,

        message:
          "يوجد تكرار في معرفات الأيام.",

        entityId:
          duplicateDayIds[0].id,

        evidence: {
          details: {
            ids:
              duplicateDayIds.map(
                (day) =>
                  day.id,
              ),
          },
        },
      },
    );
  }

  const duplicatePeriodOrders =
    problem.periods.filter(
      (
        period,
        index,
        items,
      ) =>
        items.findIndex(
          (other) =>
            other.order ===
            period.order,
        ) !== index,
    );

  if (
    duplicatePeriodOrders.length >
    0
  ) {
    addIssue(
      issues,
      {
        code:
          "DUPLICATE_PERIOD_ORDER",

        severity:
          "ERROR",

        category:
          "PROBLEM",

        proven:
          true,

        message:
          "يوجد تكرار في ترتيب الحصص اليومية.",

        entityId:
          duplicatePeriodOrders[0].id,

        evidence: {
          details: {
            orders:
              duplicatePeriodOrders.map(
                (period) =>
                  period.order,
              ),
          },
        },
      },
    );
  }

  // ==========================================================
  // Assignment integrity.
  // ==========================================================

  for (
    const assignment of
    problem.assignments
  ) {
    if (
      assignmentIds.has(
        assignment.id,
      )
    ) {
      addIssue(
        issues,
        {
          code:
            "DUPLICATE_ASSIGNMENT_ID",

          severity:
            "ERROR",

          category:
            "ASSIGNMENT",

          proven:
            true,

          message:
            "معرف التكليف مكرر.",

          entityId:
            assignment.id,

          evidence: {
            assignmentId:
              assignment.id,
          },
        },
      );
    }

    assignmentIds.add(
      assignment.id,
    );

    if (
      !teacherIds.has(
        assignment.teacherId,
      )
    ) {
      addIssue(
        issues,
        {
          code:
            "ASSIGNMENT_UNKNOWN_TEACHER",

          severity:
            "ERROR",

          category:
            "ASSIGNMENT",

          proven:
            true,

          message:
            "التكليف مرتبط بمعلم غير موجود في المشكلة.",

          entityId:
            assignment.id,

          evidence: {
            assignmentId:
              assignment.id,

            teacherId:
              assignment.teacherId,
          },
        },
      );
    }

    if (
      !classIds.has(
        assignment.classId,
      )
    ) {
      addIssue(
        issues,
        {
          code:
            "ASSIGNMENT_UNKNOWN_CLASS",

          severity:
            "ERROR",

          category:
            "ASSIGNMENT",

          proven:
            true,

          message:
            "التكليف مرتبط بفصل غير موجود في المشكلة.",

          entityId:
            assignment.id,

          evidence: {
            assignmentId:
              assignment.id,

            classId:
              assignment.classId,
          },
        },
      );
    }

    if (
      !subjectIds.has(
        assignment.subjectId,
      )
    ) {
      addIssue(
        issues,
        {
          code:
            "ASSIGNMENT_UNKNOWN_SUBJECT",

          severity:
            "ERROR",

          category:
            "ASSIGNMENT",

          proven:
            true,

          message:
            "التكليف مرتبط بمادة غير موجودة في المشكلة.",

          entityId:
            assignment.id,

          evidence: {
            assignmentId:
              assignment.id,

            subjectId:
              assignment.subjectId,
          },
        },
      );
    }

    if (
      assignment.assignedLessons <
      0
    ) {
      addIssue(
        issues,
        {
          code:
            "NEGATIVE_ASSIGNMENT_LOAD",

          severity:
            "ERROR",

          category:
            "ASSIGNMENT",

          proven:
            true,

          message:
            "عدد حصص التكليف لا يمكن أن يكون سالبًا.",

          entityId:
            assignment.id,

          evidence: {
            assignmentId:
              assignment.id,

            required:
              assignment.assignedLessons,
          },
        },
      );
    }

    const doubleSessions =
      assignment.doublePeriods *
      2;

    if (
      doubleSessions >
      assignment.assignedLessons
    ) {
      addIssue(
        issues,
        {
          code:
            "DOUBLE_PERIODS_EXCEED_ASSIGNMENT",

          severity:
            "ERROR",

          category:
            "DOUBLE_PERIOD",

          proven:
            true,

          message:
            "عدد حصص الأزواج يتجاوز إجمالي حصص التكليف.",

          entityId:
            assignment.id,

          evidence: {
            assignmentId:
              assignment.id,

            required:
              assignment.assignedLessons,

            details: {
              doublePeriods:
                assignment.doublePeriods,

              doubleSessions,
            },
          },
        },
      );
    }

    if (
      assignment.fixedSlots.length >
      assignment.assignedLessons
    ) {
      addIssue(
        issues,
        {
          code:
            "FIXED_SLOTS_EXCEED_ASSIGNMENT",

          severity:
            "ERROR",

          category:
            "FIXED_SLOT",

          proven:
            true,

          message:
            "عدد الحصص الثابتة أكبر من حصص التكليف.",

          entityId:
            assignment.id,

          evidence: {
            assignmentId:
              assignment.id,

            required:
              assignment.assignedLessons,

            details: {
              fixedSlots:
                assignment.fixedSlots.length,
            },
          },
        },
      );
    }
  }

  // ==========================================================
  // School total capacity.
  // ==========================================================

  const totalSchoolCapacity =
    slots.length *
    problem.classes.length;

  metrics.push({
    key:
      "totalSchoolClassCapacity",

    value:
      totalSchoolCapacity,
  });

  if (
    requiredSessions >
    totalSchoolCapacity
  ) {
    addIssue(
      issues,
      {
        code:
          "SCHOOL_TOTAL_CAPACITY_EXCEEDED",

        severity:
          "ERROR",

        category:
          "SCHOOL",

        proven:
          true,

        message:
          "إجمالي الحصص المطلوبة أكبر من السعة النظرية لجميع الفصول.",

        entityId:
          problem.projectId,

        evidence: {
          required:
            requiredSessions,

          capacity:
            totalSchoolCapacity,
        },
      },
    );
  }

  // ==========================================================
  // Per-class capacity.
  // ==========================================================

  for (
    const classItem of
    problem.classes
  ) {
    const assignments =
      problem.assignments.filter(
        (assignment) =>
          assignment.classId ===
          classItem.id,
      );

    const demand =
      sumAssignmentDemand(
        assignments,
      );

    const available =
      availableSlotsForScope(
        context,
        {
          classId:
            classItem.id,
        },
      );

    if (
      demand >
      available.length
    ) {
      addIssue(
        issues,
        {
          code:
            "CLASS_SLOT_CAPACITY_EXCEEDED",

          severity:
            "ERROR",

          category:
            "CLASS",

          proven:
            true,

          message:
            `الفصل «${classItem.name}» يحتاج حصصًا أكثر من عدد الخانات المتاحة له.`,

          entityId:
            classItem.id,

          evidence: {
            classId:
              classItem.id,

            required:
              demand,

            capacity:
              available.length,

            availableSlots:
              available.length,
          },
        },
      );
    }

    if (
      demand ===
      available.length &&
      demand > 0
    ) {
      addIssue(
        issues,
        {
          code:
            "CLASS_FULL_DENSITY",

          severity:
            "INFO",

          category:
            "CLASS",

          proven:
            false,

          message:
            `الفصل «${classItem.name}» يستخدم كل خانة متاحة؛ أي تعديل في الجدول يحتاج غالبًا تبديلات مباشرة.`,

          entityId:
            classItem.id,

          evidence: {
            classId:
              classItem.id,

            required:
              demand,

            capacity:
              available.length,
          },
        },
      );
    }
  }

  // ==========================================================
  // Teacher capacity including day-off, unavailable,
  // max daily and max consecutive.
  // ==========================================================

  for (
    const teacher of
    problem.teachers
  ) {
    const assignments =
      problem.assignments.filter(
        (assignment) =>
          assignment.teacherId ===
          teacher.id,
      );

    const demand =
      sumAssignmentDemand(
        assignments,
      );

    if (
      demand === 0
    ) {
      continue;
    }

    const maxDaily =
      minPositiveLimit(
        hardConstraints,
        "TEACHER_MAX_DAILY",
        {
          teacherId:
            teacher.id,
        },
      );

    const maxConsecutive =
      minPositiveLimit(
        hardConstraints,
        "TEACHER_MAX_CONSECUTIVE",
        {
          teacherId:
            teacher.id,
        },
      );

    let totalCapacity =
      0;

    const dailyCapacity:
      Record<string, number> =
      {};

    for (
      const day of
      problem.days
    ) {
      const available =
        availableSlotsForScopeOnDay(
          context,
          {
            teacherId:
              teacher.id,
          },
          day.id,
        );

      let capacity =
        available.length;

      if (maxDaily) {
        capacity =
          Math.min(
            capacity,
            maxDaily.value,
          );
      }

      if (maxConsecutive) {
        const consecutiveCapacity =
          maxOccupancyWithConsecutiveLimit(
            available.map(
              (slot) =>
                slot.periodOrder,
            ),
            maxConsecutive.value,
          );

        capacity =
          Math.min(
            capacity,
            consecutiveCapacity,
          );
      }

      dailyCapacity[day.id] =
        capacity;

      totalCapacity +=
        capacity;
    }

    if (
      demand >
      totalCapacity
    ) {
      addIssue(
        issues,
        {
          code:
            "TEACHER_WEEKLY_CAPACITY_EXCEEDED",

          severity:
            "ERROR",

          category:
            "TEACHER",

          proven:
            true,

          message:
            `حمل المعلم «${teacher.name}» الأسبوعي أكبر من أقصى سعة ممكنة بعد تطبيق أيام الراحة وعدم التوفر والحدود اليومية والمتتالية.`,

          entityId:
            teacher.id,

          evidence: {
            teacherId:
              teacher.id,

            required:
              demand,

            capacity:
              totalCapacity,

            details: {
              dailyCapacity,

              maxDaily:
                maxDaily?.value ??
                null,

              maxConsecutive:
                maxConsecutive?.value ??
                null,
            },
          },
        },
      );
    }

    if (
      teacher.maxWeeklyLoad != null &&
      demand >
      teacher.maxWeeklyLoad
    ) {
      addIssue(
        issues,
        {
          code:
            "TEACHER_DECLARED_WEEKLY_LOAD_EXCEEDED",

          severity:
            "ERROR",

          category:
            "TEACHER",

          proven:
            true,

          message:
            `حصص المعلم «${teacher.name}» تتجاوز الحد الأسبوعي المسجل له.`,

          entityId:
            teacher.id,

          evidence: {
            teacherId:
              teacher.id,

            required:
              demand,

            limit:
              teacher.maxWeeklyLoad,
          },
        },
      );
    }
  }

  // ==========================================================
  // Assignment intersection capacity:
  // teacher + class + subject + school restrictions.
  // ==========================================================

  for (
    const assignment of
    problem.assignments
  ) {
    if (
      assignment.assignedLessons <=
      0
    ) {
      continue;
    }

    const scope:
      ConstraintScope =
      {
        teacherId:
          assignment.teacherId,

        classId:
          assignment.classId,

        subjectId:
          assignment.subjectId,
      };

    const available =
      availableSlotsForScope(
        context,
        scope,
      );

    if (
      assignment.assignedLessons >
      available.length
    ) {
      addIssue(
        issues,
        {
          code:
            "ASSIGNMENT_INTERSECTION_CAPACITY_EXCEEDED",

          severity:
            "ERROR",

          category:
            "ASSIGNMENT",

          proven:
            true,

          message:
            "التكليف لا يملك عددًا كافيًا من الخانات التي تكون متاحة للمعلم والفصل والمادة معًا.",

          entityId:
            assignment.id,

          evidence: {
            assignmentId:
              assignment.id,

            teacherId:
              assignment.teacherId,

            classId:
              assignment.classId,

            subjectId:
              assignment.subjectId,

            required:
              assignment.assignedLessons,

            capacity:
              available.length,
          },
        },
      );
    }

    const subjectDailyLimit =
      minPositiveLimit(
        hardConstraints,
        "SUBJECT_MAX_DAILY",
        {
          subjectId:
            assignment.subjectId,

          classId:
            assignment.classId,
        },
      );

    if (subjectDailyLimit) {
      let weeklySubjectCapacity =
        0;

      let availableDays =
        0;

      const daily:
        Record<string, number> =
        {};

      for (
        const day of
        problem.days
      ) {
        const dayAvailable =
          availableSlotsForScopeOnDay(
            context,
            scope,
            day.id,
          );

        const capacity =
          Math.min(
            dayAvailable.length,
            subjectDailyLimit.value,
          );

        daily[day.id] =
          capacity;

        weeklySubjectCapacity +=
          capacity;

        if (
          capacity >
          0
        ) {
          availableDays +=
            1;
        }
      }

      if (
        assignment.assignedLessons >
        weeklySubjectCapacity
      ) {
        addIssue(
          issues,
          {
            code:
              "ASSIGNMENT_SUBJECT_DAILY_CAPACITY_EXCEEDED",

            severity:
              "ERROR",

            category:
              "SUBJECT",

            proven:
              true,

            message:
              "عدد حصص المادة في هذا التكليف أكبر من السعة الأسبوعية الممكنة بعد تطبيق الحد اليومي والخانات المتاحة.",

            entityId:
              assignment.id,

            evidence: {
              assignmentId:
                assignment.id,

              teacherId:
                assignment.teacherId,

              classId:
                assignment.classId,

              subjectId:
                assignment.subjectId,

              constraintId:
                subjectDailyLimit.constraintId,

              required:
                assignment.assignedLessons,

              capacity:
                weeklySubjectCapacity,

              availableDays,

              limit:
                subjectDailyLimit.value,

              details: {
                dailyCapacity:
                  daily,
              },
            },
          },
        );
      }
    }

    if (
      assignment.doublePeriods >
      0
    ) {
      const startCount =
        countConsecutiveStarts(
          available,
          2,
        );

      if (
        startCount === 0
      ) {
        addIssue(
          issues,
          {
            code:
              "DOUBLE_PERIOD_NO_CONSECUTIVE_START",

            severity:
              "ERROR",

            category:
              "DOUBLE_PERIOD",

            proven:
              true,

            message:
              "التكليف يتطلب حصة مزدوجة ولكن لا توجد أي خانتين متتاليتين متاحتين له.",

            entityId:
              assignment.id,

            evidence: {
              assignmentId:
                assignment.id,

              teacherId:
                assignment.teacherId,

              classId:
                assignment.classId,

              subjectId:
                assignment.subjectId,

              required:
                assignment.doublePeriods,

              capacity:
                startCount,
            },
          },
        );
      }
      else if (
        assignment.doublePeriods >
        startCount
      ) {
        addIssue(
          issues,
          {
            code:
              "DOUBLE_PERIOD_START_CAPACITY_SUSPICIOUS",

            severity:
              "WARNING",

            category:
              "DOUBLE_PERIOD",

            proven:
              false,

            message:
              "عدد الحصص المزدوجة كبير مقارنة بعدد بدايات الفترات المتتالية المتاحة. قد يتطلب الأمر فحصًا تركيبيًا أعمق بسبب تداخل البدايات.",

            entityId:
              assignment.id,

            evidence: {
              assignmentId:
                assignment.id,

              required:
                assignment.doublePeriods,

              capacity:
                startCount,
            },
          },
        );
      }
    }
  }

  // ==========================================================
  // Aggregate subject + class checks.
  // Important when several assignments contribute to the same
  // subject/class combination.
  // ==========================================================

  const subjectClassKeys =
    new Set<string>();

  for (
    const assignment of
    problem.assignments
  ) {
    subjectClassKeys.add(
      `${assignment.subjectId}::${assignment.classId}`,
    );
  }

  for (
    const key of
    subjectClassKeys
  ) {
    const [
      subjectId,
      classId,
    ] =
      key.split(
        "::",
      );

    const assignments =
      problem.assignments.filter(
        (assignment) =>
          assignment.subjectId ===
            subjectId &&
          assignment.classId ===
            classId,
      );

    const demand =
      sumAssignmentDemand(
        assignments,
      );

    const dailyLimit =
      minPositiveLimit(
        hardConstraints,
        "SUBJECT_MAX_DAILY",
        {
          subjectId,
          classId,
        },
      );

    if (!dailyLimit) {
      continue;
    }

    let totalCapacity =
      0;

    let usableDays =
      0;

    const capacities:
      Record<string, number> =
      {};

    for (
      const day of
      problem.days
    ) {
      let dayHasAnyCandidate =
        false;

      for (
        const assignment of
        assignments
      ) {
        const candidates =
          availableSlotsForScopeOnDay(
            context,
            {
              teacherId:
                assignment.teacherId,

              classId,

              subjectId,
            },
            day.id,
          );

        if (
          candidates.length >
          0
        ) {
          dayHasAnyCandidate =
            true;

          break;
        }
      }

      const capacity =
        dayHasAnyCandidate
          ? dailyLimit.value
          : 0;

      capacities[day.id] =
        capacity;

      totalCapacity +=
        capacity;

      if (
        capacity >
        0
      ) {
        usableDays +=
          1;
      }
    }

    if (
      demand >
      totalCapacity
    ) {
      addIssue(
        issues,
        {
          code:
            "SUBJECT_CLASS_WEEKLY_CAPACITY_EXCEEDED",

          severity:
            "ERROR",

          category:
            "SUBJECT",

          proven:
            true,

          message:
            "إجمالي حصص المادة لهذا الفصل لا يمكن توزيعه ضمن الحد اليومي والأيام المتاحة.",

          entityId:
            `${subjectId}:${classId}`,

          evidence: {
            subjectId,
            classId,

            constraintId:
              dailyLimit.constraintId,

            required:
              demand,

            capacity:
              totalCapacity,

            availableDays:
              usableDays,

            limit:
              dailyLimit.value,

            details: {
              dailyCapacity:
                capacities,
            },
          },
        },
      );
    }

    if (
      dailyLimit.value === 1 &&
      demand ===
        problem.days.length
    ) {
      addIssue(
        issues,
        {
          code:
            "SUBJECT_CLASS_REQUIRES_EVERY_DAY",

          severity:
            "INFO",

          category:
            "SUBJECT",

          proven:
            false,

          message:
            "هذه المادة يجب أن تظهر مرة واحدة في كل يوم دراسي بالضبط؛ فقدان أي يوم صالح يجعل الجدول مستحيلًا.",

          entityId:
            `${subjectId}:${classId}`,

          evidence: {
            subjectId,
            classId,

            required:
              demand,

            availableDays:
              problem.days.length,

            limit:
              1,
          },
        },
      );
    }
  }

  // ==========================================================
  // Fixed slot validation and collisions.
  // ==========================================================

  const fixedTeacherSlots =
    new Map<
      string,
      string
    >();

  const fixedClassSlots =
    new Map<
      string,
      string
    >();

  for (
    const assignment of
    problem.assignments
  ) {
    for (
      const fixed of
      assignment.fixedSlots
    ) {
      if (
        !fixed.isLocked
      ) {
        continue;
      }

      const slot =
        slots.find(
          (candidate) =>
            candidate.dayId ===
              fixed.dayId &&
            candidate.periodId ===
              fixed.periodId,
        );

      if (!slot) {
        addIssue(
          issues,
          {
            code:
              "FIXED_SLOT_UNKNOWN",

            severity:
              "ERROR",

            category:
              "FIXED_SLOT",

            proven:
              true,

            message:
              "الحصة الثابتة تشير إلى يوم أو فترة غير موجودة.",

            entityId:
              assignment.id,

            evidence: {
              assignmentId:
                assignment.id,

              dayId:
                fixed.dayId,

              periodId:
                fixed.periodId,
            },
          },
        );

        continue;
      }

      const blocked =
        isSlotStructurallyBlocked(
          context,
          slot,
          {
            teacherId:
              assignment.teacherId,

            classId:
              assignment.classId,

            subjectId:
              assignment.subjectId,
          },
        );

      if (blocked) {
        addIssue(
          issues,
          {
            code:
              "FIXED_SLOT_BLOCKED_BY_HARD_CONSTRAINT",

            severity:
              "ERROR",

            category:
              "FIXED_SLOT",

            proven:
              true,

            message:
              "هناك حصة ثابتة موضوعة في خانة يمنعها أحد قيود HARD.",

            entityId:
              assignment.id,

            evidence: {
              assignmentId:
                assignment.id,

              teacherId:
                assignment.teacherId,

              classId:
                assignment.classId,

              subjectId:
                assignment.subjectId,

              dayId:
                fixed.dayId,

              periodId:
                fixed.periodId,
            },
          },
        );
      }

      const teacherKey =
        `${assignment.teacherId}:${fixed.dayId}:${fixed.periodId}`;

      const existingTeacher =
        fixedTeacherSlots.get(
          teacherKey,
        );

      if (
        existingTeacher &&
        existingTeacher !==
          assignment.id
      ) {
        addIssue(
          issues,
          {
            code:
              "FIXED_TEACHER_COLLISION",

            severity:
              "ERROR",

            category:
              "FIXED_SLOT",

            proven:
              true,

            message:
              "المعلم مثبت في تكليفين مختلفين في نفس الحصة.",

            entityId:
              assignment.teacherId,

            evidence: {
              teacherId:
                assignment.teacherId,

              dayId:
                fixed.dayId,

              periodId:
                fixed.periodId,

              details: {
                firstAssignmentId:
                  existingTeacher,

                secondAssignmentId:
                  assignment.id,
              },
            },
          },
        );
      }
      else {
        fixedTeacherSlots.set(
          teacherKey,
          assignment.id,
        );
      }

      const classKey =
        `${assignment.classId}:${fixed.dayId}:${fixed.periodId}`;

      const existingClass =
        fixedClassSlots.get(
          classKey,
        );

      if (
        existingClass &&
        existingClass !==
          assignment.id
      ) {
        addIssue(
          issues,
          {
            code:
              "FIXED_CLASS_COLLISION",

            severity:
              "ERROR",

            category:
              "FIXED_SLOT",

            proven:
              true,

            message:
              "الفصل مثبت له تكليفان مختلفان في نفس الحصة.",

            entityId:
              assignment.classId,

            evidence: {
              classId:
                assignment.classId,

              dayId:
                fixed.dayId,

              periodId:
                fixed.periodId,

              details: {
                firstAssignmentId:
                  existingClass,

                secondAssignmentId:
                  assignment.id,
              },
            },
          },
        );
      }
      else {
        fixedClassSlots.set(
          classKey,
          assignment.id,
        );
      }
    }
  }

  // ==========================================================
  // Constraint sanity checks.
  // ==========================================================

  for (
    const constraint of
    hardConstraints
  ) {
    const type =
      canonicalConstraintType(
        constraint.type,
      );

    if (
      (
        type ===
          "TEACHER_MAX_DAILY" ||
        type ===
          "TEACHER_MAX_CONSECUTIVE" ||
        type ===
          "SUBJECT_MAX_DAILY"
      ) &&
      (
        constraint.valueInt == null ||
        constraint.valueInt <= 0
      )
    ) {
      addIssue(
        issues,
        {
          code:
            "INVALID_POSITIVE_CONSTRAINT_LIMIT",

          severity:
            "ERROR",

          category:
            "CONSTRAINT",

          proven:
            true,

          message:
            "قيد HARD يتطلب حدًا رقميًا موجبًا لكنه لا يحتوي قيمة صالحة.",

          entityId:
            constraint.id,

          evidence: {
            constraintId:
              constraint.id,

            limit:
              constraint.valueInt ??
              undefined,

            details: {
              type:
                constraint.type,
            },
          },
        },
      );
    }
  }

  // ==========================================================
  // Final status.
  // ==========================================================

  // Resolve display names from the current GenerationProblem. These are
  // project-local entities, so manually entered classes and subjects remain
  // explainable without consulting an external school catalogue.
  for (const issue of issues) {
    const evidence = issue.evidence;
    const teacher = evidence.teacherId
      ? teacherById.get(evidence.teacherId)
      : undefined;
    const classItem = evidence.classId
      ? classById.get(evidence.classId)
      : undefined;
    const subject = evidence.subjectId
      ? subjectById.get(evidence.subjectId)
      : undefined;

    issue.evidence = {
      ...evidence,
      ...(teacher && !evidence.teacherName
        ? { teacherName: teacher.name }
        : {}),
      ...(classItem && !evidence.className
        ? { className: classItem.name }
        : {}),
      ...(subject && !evidence.subjectName
        ? { subjectName: subject.name }
        : {}),
    };
  }

  const provenContradictions =
    issues.filter(
      (issue) =>
        issue.proven &&
        issue.severity ===
          "ERROR",
    );

  const structuralProblem =
    provenContradictions.some(
      (issue) =>
        issue.category ===
          "PROBLEM" ||
        issue.code.startsWith(
          "ASSIGNMENT_UNKNOWN_",
        ) ||
        issue.code ===
          "DUPLICATE_ASSIGNMENT_ID",
    );

  const warnings =
    issues.filter(
      (issue) =>
        issue.severity ===
        "WARNING",
    ).length;

  const infos =
    issues.filter(
      (issue) =>
        issue.severity ===
        "INFO",
    ).length;

  const status =
    structuralProblem
      ? "INVALID_PROBLEM"
      : provenContradictions.length >
          0
        ? "PROVABLY_INFEASIBLE"
        : "NO_PROVEN_CONTRADICTION";

  return {
    version:
      "1",

    status,

    feasible:
      status ===
        "PROVABLY_INFEASIBLE"
        ? false
        : null,

    projectId:
      problem.projectId,

    analyzedAt:
      new Date().toISOString(),

    durationMs:
      Date.now() -
      startedAt,

    summary: {
      days:
        problem.days.length,

      periodsPerDay:
        problem.periods.length,

      schoolSlots:
        slots.length,

      classes:
        problem.classes.length,

      teachers:
        problem.teachers.length,

      subjects:
        problem.subjects.length,

      assignments:
        problem.assignments.length,

      constraints:
        problem.constraints.length,

      requiredSessions,

      provenContradictions:
        provenContradictions.length,

      warnings,

      infos,
    },

    issues,

    metrics,
  };
}
