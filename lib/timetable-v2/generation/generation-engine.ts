import {
  normalizeGenerationConstraintType,
  SUPPORTED_HARD_GENERATION_CONSTRAINTS,
  SUPPORTED_SOFT_GENERATION_CONSTRAINTS,
} from "./constraint-type-normalizer";

import {
  getGenerationCatalogCompatibilityIssues,
} from "./constraint-compatibility";

import {
  validateGeneratedTimetableV2,
} from "./generation-validator";

import type {
  GeneratedSession,
  GenerationAttemptResult,
  GenerationConstraint,
  GenerationDiagnostic,
  GenerationOptions,
  GenerationPeriod,
  GenerationProblem,
  GenerationResult,
  GenerationScoreBreakdown,
  GenerationTask,
} from "./generation-domain";

export const ENGINE_VERSION =
  "timetable-v2-engine-1.2.0";

type PreparedConstraint =
  GenerationConstraint & {
    type: string;
    effectiveSlots:
      Set<string>;
  };

type Candidate = {
  dayId: string;

  periodIds: string[];
  periodOrders: number[];

  penalty: number;

  source:
    GeneratedSession["source"];

  locked: boolean;
};

type EngineState = {
  sessions:
    GeneratedSession[];

  teacherBusy:
    Set<string>;

  classBusy:
    Set<string>;

  teacherDayCount:
    Map<string, number>;

  classDayCount:
    Map<string, number>;

  subjectClassDayCount:
    Map<string, number>;

  teacherDayPeriods:
    Map<string, Set<number>>;

  classDayPeriods:
    Map<string, Set<number>>;

  subjectClassDayPeriods:
    Map<string, Set<number>>;

  subjectClassDays:
    Map<string, Set<string>>;

  teacherFirstCount:
    Map<string, number>;

  teacherLastCount:
    Map<string, number>;
};

function slotKey(
  dayId: string,
  periodId: string,
) {
  return `${dayId}:${periodId}`;
}

function teacherSlotKey(
  teacherId: string,
  dayId: string,
  periodId: string,
) {
  return `${teacherId}:${dayId}:${periodId}`;
}

function classSlotKey(
  classId: string,
  dayId: string,
  periodId: string,
) {
  return `${classId}:${dayId}:${periodId}`;
}

function teacherDayKey(
  teacherId: string,
  dayId: string,
) {
  return `${teacherId}:${dayId}`;
}

function classDayKey(
  classId: string,
  dayId: string,
) {
  return `${classId}:${dayId}`;
}

function subjectClassKey(
  classId: string,
  subjectId: string,
) {
  return `${classId}:${subjectId}`;
}

function subjectClassDayKey(
  classId: string,
  subjectId: string,
  dayId: string,
) {
  return `${classId}:${subjectId}:${dayId}`;
}

function createRandom(
  seed: number,
) {
  let value =
    seed >>> 0;

  return () => {
    value +=
      0x6d2b79f5;

    let t =
      value;

    t =
      Math.imul(
        t ^ (t >>> 15),
        t | 1,
      );

    t ^=
      t +
      Math.imul(
        t ^ (t >>> 7),
        t | 61,
      );

    return (
      (
        t ^
        (t >>> 14)
      ) >>> 0
    ) /
      4294967296;
  };
}

function createState():
  EngineState {
  return {
    sessions: [],

    teacherBusy:
      new Set(),

    classBusy:
      new Set(),

    teacherDayCount:
      new Map(),

    classDayCount:
      new Map(),

    subjectClassDayCount:
      new Map(),

    teacherDayPeriods:
      new Map(),

    classDayPeriods:
      new Map(),

    subjectClassDayPeriods:
      new Map(),

    subjectClassDays:
      new Map(),

    teacherFirstCount:
      new Map(),

    teacherLastCount:
      new Map(),
  };
}

function addCount(
  map:
    Map<string, number>,
  key: string,
  amount = 1,
) {
  map.set(
    key,
    (
      map.get(key) ??
      0
    ) + amount,
  );
}

function subtractCount(
  map:
    Map<string, number>,
  key: string,
  amount = 1,
) {
  const next =
    (
      map.get(key) ??
      0
    ) -
    amount;

  if (
    next <= 0
  ) {
    map.delete(key);
  }
  else {
    map.set(
      key,
      next,
    );
  }
}

function addToSetMap(
  map:
    Map<string, Set<number>>,
  key: string,
  values: number[],
) {
  const next =
    new Set(
      map.get(key) ??
      [],
    );

  for (
    const value of values
  ) {
    next.add(value);
  }

  map.set(
    key,
    next,
  );
}

function removeFromSetMap(
  map:
    Map<string, Set<number>>,
  key: string,
  values: number[],
) {
  const next =
    new Set(
      map.get(key) ??
      [],
    );

  for (
    const value of values
  ) {
    next.delete(value);
  }

  if (
    next.size === 0
  ) {
    map.delete(key);
  }
  else {
    map.set(
      key,
      next,
    );
  }
}

function countGaps(
  values:
    Iterable<number>,
) {
  const periods =
    [...new Set(values)]
      .sort(
        (a, b) =>
          a - b,
      );

  if (
    periods.length < 2
  ) {
    return 0;
  }

  return Math.max(
    0,
    periods[
      periods.length - 1
    ] -
      periods[0] +
      1 -
      periods.length,
  );
}

function longestConsecutive(
  values:
    Iterable<number>,
) {
  const periods =
    [...new Set(values)]
      .sort(
        (a, b) =>
          a - b,
      );

  let longest = 0;
  let current = 0;
  let previous:
    number | null =
      null;

  for (
    const period of
    periods
  ) {
    if (
      previous !== null &&
      period ===
        previous + 1
    ) {
      current += 1;
    }
    else {
      current = 1;
    }

    longest =
      Math.max(
        longest,
        current,
      );

    previous =
      period;
  }

  return longest;
}

function prepareConstraints(
  problem:
    GenerationProblem,
) {
  const allDays =
    problem.days.map(
      (day) => day.id,
    );

  const allPeriods =
    problem.periods.map(
      (period) =>
        period.id,
    );

  return problem.constraints.map(
    (
      constraint,
    ): PreparedConstraint => {
      const type =
        normalizeGenerationConstraintType(
          constraint.type,
        );

      const effectiveSlots =
        new Set<string>();

      if (
        constraint.slots.length >
        0
      ) {
        for (
          const slot of
          constraint.slots
        ) {
          effectiveSlots.add(
            slotKey(
              slot.dayId,
              slot.periodId,
            ),
          );
        }
      }
      else if (
        constraint.dayIds.length >
          0 &&
        constraint.periodIds.length >
          0
      ) {
        for (
          const dayId of
          constraint.dayIds
        ) {
          for (
            const periodId of
            constraint.periodIds
          ) {
            effectiveSlots.add(
              slotKey(
                dayId,
                periodId,
              ),
            );
          }
        }
      }
      else if (
        constraint.dayIds.length >
        0
      ) {
        for (
          const dayId of
          constraint.dayIds
        ) {
          for (
            const periodId of
            allPeriods
          ) {
            effectiveSlots.add(
              slotKey(
                dayId,
                periodId,
              ),
            );
          }
        }
      }
      else if (
        constraint.periodIds.length >
        0
      ) {
        for (
          const dayId of
          allDays
        ) {
          for (
            const periodId of
            constraint.periodIds
          ) {
            effectiveSlots.add(
              slotKey(
                dayId,
                periodId,
              ),
            );
          }
        }
      }

      return {
        ...constraint,
        type,
        effectiveSlots,
      };
    },
  );
}

function matchesTarget(
  values: string[],
  value: string,
) {
  return (
    values.length === 0 ||
    values.includes(value)
  );
}

function matchesTask(
  constraint:
    PreparedConstraint,
  task:
    GenerationTask,
) {
  return (
    matchesTarget(
      constraint.teacherIds,
      task.teacherId,
    ) &&
    matchesTarget(
      constraint.subjectIds,
      task.subjectId,
    ) &&
    matchesTarget(
      constraint.classIds,
      task.classId,
    )
  );
}

function candidateTouchesConstraint(
  constraint:
    PreparedConstraint,
  candidate:
    Candidate,
) {
  if (
    constraint.effectiveSlots
      .size === 0
  ) {
    return true;
  }

  return candidate.periodIds.some(
    (periodId) =>
      constraint.effectiveSlots.has(
        slotKey(
          candidate.dayId,
          periodId,
        ),
      ),
  );
}

function candidateFullyInsideConstraint(
  constraint:
    PreparedConstraint,
  candidate:
    Candidate,
) {
  if (
    constraint.effectiveSlots
      .size === 0
  ) {
    return true;
  }

  return candidate.periodIds.every(
    (periodId) =>
      constraint.effectiveSlots.has(
        slotKey(
          candidate.dayId,
          periodId,
        ),
      ),
  );
}

function getWeight(
  constraint:
    PreparedConstraint,
) {
  return Math.max(
    1,
    Math.min(
      100,
      Number.isFinite(
        constraint.weight,
      )
        ? Math.round(
            constraint.weight,
          )
        : 1,
    ),
  );
}

function buildTasks(
  problem:
    GenerationProblem,
  prepared:
    PreparedConstraint[],
) {
  const diagnostics:
    GenerationDiagnostic[] =
      [];

  const tasks:
    GenerationTask[] =
      [];

  for (
    const assignment of
    problem.assignments
  ) {
    const calculated =
      assignment.singlePeriods +
      assignment.doublePeriods *
        2;

    if (
      calculated !==
      assignment.assignedLessons
    ) {
      diagnostics.push({
        code:
          "ASSIGNMENT_BLOCK_TOTAL_MISMATCH",

        level:
          "ERROR",

        title:
          "تركيب الإسناد غير متطابق",

        description:
          `${assignment.teacherName} / ${assignment.subjectName} / ${assignment.className}: الإسناد ${assignment.assignedLessons} حصة، لكن الفردية والمزدوجة تساوي ${calculated}.`,

        assignmentId:
          assignment.id,
      });

      continue;
    }

    let fixedIndex = 0;

    for (
      let index = 0;
      index <
      assignment.doublePeriods;
      index += 1
    ) {
      tasks.push({
        id:
          `${assignment.id}:double:${index}`,

        assignmentId:
          assignment.id,

        teacherId:
          assignment.teacherId,

        teacherName:
          assignment.teacherName,

        classId:
          assignment.classId,

        className:
          assignment.className,

        subjectId:
          assignment.subjectId,

        subjectName:
          assignment.subjectName,

        length: 2,

        fixedSlot:
          assignment.fixedSlots[
            fixedIndex
          ],

        fixedSource:
          assignment.fixedSlots[
            fixedIndex
          ]
            ? "FIXED_ASSIGNMENT_JSON"
            : undefined,

        blockNumber:
          index,
      });

      fixedIndex += 1;
    }

    for (
      let index = 0;
      index <
      assignment.singlePeriods;
      index += 1
    ) {
      tasks.push({
        id:
          `${assignment.id}:single:${index}`,

        assignmentId:
          assignment.id,

        teacherId:
          assignment.teacherId,

        teacherName:
          assignment.teacherName,

        classId:
          assignment.classId,

        className:
          assignment.className,

        subjectId:
          assignment.subjectId,

        subjectName:
          assignment.subjectName,

        length: 1,

        fixedSlot:
          assignment.fixedSlots[
            fixedIndex
          ],

        fixedSource:
          assignment.fixedSlots[
            fixedIndex
          ]
            ? "FIXED_ASSIGNMENT_JSON"
            : undefined,

        blockNumber:
          index,
      });

      fixedIndex += 1;
    }
  }

  const fixedRules =
    [
      ...prepared.filter(
        (constraint) =>
          constraint.strength ===
            "HARD" &&
          constraint.type ===
            "FIXED_ASSIGNMENT",
      ),

      ...prepared.filter(
        (constraint) =>
          constraint.strength ===
            "HARD" &&
          constraint.type ===
            "FIXED_TEACHER_SLOT",
      ),

      ...prepared.filter(
        (constraint) =>
          constraint.strength ===
            "HARD" &&
          constraint.type ===
            "FIXED_SUBJECT_DAY",
      ),
    ];

  for (
    const constraint of
    fixedRules
  ) {
    if (
      constraint.type ===
      "FIXED_ASSIGNMENT"
    ) {
      for (
        const slotValue of
        constraint.effectiveSlots
      ) {
        const [
          dayId,
          periodId,
        ] =
          slotValue.split(":");

        const task =
          tasks.find(
            (candidateTask) =>
              !candidateTask.fixedSlot &&
              !candidateTask.fixedDayId &&
              matchesTask(
                constraint,
                candidateTask,
              ),
          );

        if (!task) {
          diagnostics.push({
            code:
              "FIXED_ASSIGNMENT_HAS_NO_TASK",

            level:
              "ERROR",

            title:
              "لا توجد حصة مطابقة للتثبيت",

            description:
              "يوجد تثبيت إسناد إلزامي لكن لا توجد حصة متبقية تطابق المعلم والمادة والفصل.",

            constraintId:
              constraint.id,
          });

          continue;
        }

        task.fixedSlot = {
          dayId,
          periodId,
          isLocked:
            true,
        };

        task.fixedSource =
          "FIXED_ASSIGNMENT";
      }

      continue;
    }

    if (
      constraint.type ===
      "FIXED_TEACHER_SLOT"
    ) {
      for (
        const teacherId of
        constraint.teacherIds
      ) {
        for (
          const slotValue of
          constraint.effectiveSlots
        ) {
          const [
            dayId,
            periodId,
          ] =
            slotValue.split(":");

          const task =
            tasks.find(
              (candidateTask) =>
                candidateTask.teacherId ===
                  teacherId &&
                !candidateTask.fixedSlot &&
                !candidateTask.fixedDayId,
            );

          if (!task) {
            diagnostics.push({
              code:
                "FIXED_TEACHER_SLOT_HAS_NO_TASK",

              level:
                "ERROR",

              title:
                "لا توجد حصة للمعلم المثبت",

              description:
                "يوجد تثبيت معلم في خلية محددة لكن لا توجد حصة متبقية لهذا المعلم يمكن تثبيتها.",

              constraintId:
                constraint.id,
            });

            continue;
          }

          task.fixedSlot = {
            dayId,
            periodId,
            isLocked:
              true,
          };

          task.fixedSource =
            "FIXED_TEACHER_SLOT";
        }
      }

      continue;
    }

    if (
      constraint.type ===
      "FIXED_SUBJECT_DAY"
    ) {
      for (
        const dayId of
        constraint.dayIds
      ) {
        const task =
          tasks.find(
            (candidateTask) =>
              !candidateTask.fixedSlot &&
              !candidateTask.fixedDayId &&
              matchesTarget(
                constraint.subjectIds,
                candidateTask.subjectId,
              ) &&
              matchesTarget(
                constraint.classIds,
                candidateTask.classId,
              ),
          );

        if (!task) {
          diagnostics.push({
            code:
              "FIXED_SUBJECT_DAY_HAS_NO_TASK",

            level:
              "ERROR",

            title:
              "لا توجد حصة للمادة في اليوم المثبت",

            description:
              "يوجد تثبيت مادة وفصل في يوم محدد لكن لا توجد حصة متبقية مطابقة يمكن تثبيتها.",

            constraintId:
              constraint.id,
          });

          continue;
        }

        task.fixedDayId =
          dayId;

        task.fixedSource =
          "FIXED_SUBJECT_DAY";
      }
    }
  }

  return {
    tasks,
    diagnostics,
  };
}

function getPeriodBlock(
  problem:
    GenerationProblem,
  startPeriod:
    GenerationPeriod,
  length: 1 | 2,
) {
  if (
    length === 1
  ) {
    return [
      startPeriod,
    ];
  }

  const second =
    problem.periods.find(
      (period) =>
        period.order ===
        startPeriod.order +
          1,
    );

  if (!second) {
    return null;
  }

  return [
    startPeriod,
    second,
  ];
}

function withCandidatePeriods(
  state:
    EngineState,
  map:
    Map<string, Set<number>>,
  key: string,
  candidate:
    Candidate,
) {
  return new Set([
    ...(
      map.get(key) ??
      []
    ),
    ...candidate.periodOrders,
  ]);
}

function hardAllows(
  problem:
    GenerationProblem,
  prepared:
    PreparedConstraint[],
  state:
    EngineState,
  task:
    GenerationTask,
  candidate:
    Candidate,
) {
  for (
    const periodId of
    candidate.periodIds
  ) {
    if (
      state.teacherBusy.has(
        teacherSlotKey(
          task.teacherId,
          candidate.dayId,
          periodId,
        ),
      )
    ) {
      return false;
    }

    if (
      state.classBusy.has(
        classSlotKey(
          task.classId,
          candidate.dayId,
          periodId,
        ),
      )
    ) {
      return false;
    }
  }

  const firstOrder =
    problem.periods[0]
      ?.order;

  const lastOrder =
    problem.periods[
      problem.periods.length -
        1
    ]?.order;

  for (
    const constraint of
    prepared
  ) {
    if (
      constraint.strength !==
      "HARD"
    ) {
      continue;
    }

    const type =
      constraint.type;

    if (
      type ===
        "SUBJECT_SPECIFIC_TEACHER" &&
      constraint.subjectIds.includes(
        task.subjectId,
      ) &&
      matchesTarget(
        constraint.classIds,
        task.classId,
      ) &&
      !constraint.teacherIds.includes(
        task.teacherId,
      )
    ) {
      return false;
    }

    if (
      type ===
        "CLASS_NO_DOUBLE" &&
      constraint.classIds.includes(
        task.classId,
      )
    ) {
      if (
        task.length === 2
      ) {
        return false;
      }

      const existing =
        state.subjectClassDayPeriods.get(
          subjectClassDayKey(
            task.classId,
            task.subjectId,
            candidate.dayId,
          ),
        );

      if (existing) {
        for (
          const order of
          candidate.periodOrders
        ) {
          if (
            existing.has(
              order - 1,
            ) ||
            existing.has(
              order + 1,
            )
          ) {
            return false;
          }
        }
      }
    }

    const targetMatches =
      matchesTask(
        constraint,
        task,
      );

    const touches =
      candidateTouchesConstraint(
        constraint,
        candidate,
      );

    if (
      [
        "SCHOOL_BLOCKED_SLOT",
        "SCHOOL_NO_TEACHING_SLOT",
        "SCHOOL_FIXED_EVENT",
      ].includes(type) &&
      touches
    ) {
      return false;
    }

    if (
      [
        "TEACHER_UNAVAILABLE",
        "TEACHER_DAY_OFF",
      ].includes(type) &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      touches
    ) {
      return false;
    }

    if (
      [
        "SUBJECT_BLOCKED",
        "SUBJECT_BLOCKED_DAYS",
      ].includes(type) &&
      constraint.subjectIds.includes(
        task.subjectId,
      ) &&
      matchesTarget(
        constraint.classIds,
        task.classId,
      ) &&
      touches
    ) {
      return false;
    }

    if (
      type ===
        "SUBJECT_ALLOWED_DAYS" &&
      constraint.subjectIds.includes(
        task.subjectId,
      ) &&
      matchesTarget(
        constraint.classIds,
        task.classId,
      ) &&
      constraint.dayIds.length >
        0 &&
      !constraint.dayIds.includes(
        candidate.dayId,
      )
    ) {
      return false;
    }

    if (
      type ===
        "SUBJECT_ALLOWED_PERIODS" &&
      constraint.subjectIds.includes(
        task.subjectId,
      ) &&
      matchesTarget(
        constraint.classIds,
        task.classId,
      ) &&
      constraint.periodIds.length >
        0 &&
      !candidate.periodIds.every(
        (periodId) =>
          constraint.periodIds.includes(
            periodId,
          ),
      )
    ) {
      return false;
    }

    if (
      [
        "CLASS_BLOCKED_SLOT",
        "CLASS_BLOCKED_DAY",
        "CLASS_BLOCKED_PERIOD",
        "CLASS_FIXED_ACTIVITY",
      ].includes(type) &&
      constraint.classIds.includes(
        task.classId,
      ) &&
      touches
    ) {
      return false;
    }

    if (
      type ===
        "ASSIGNMENT_BLOCKED_SLOT" &&
      targetMatches &&
      touches
    ) {
      return false;
    }

    if (
      type ===
        "TEACHER_AVOID_BEFORE_PERIOD" &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      constraint.valueInt !==
        null &&
      candidate.periodOrders.some(
        (order) =>
          order <
          constraint.valueInt!,
      )
    ) {
      return false;
    }

    if (
      type ===
        "TEACHER_AVOID_AFTER_PERIOD" &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      constraint.valueInt !==
        null &&
      candidate.periodOrders.some(
        (order) =>
          order >
          constraint.valueInt!,
      )
    ) {
      return false;
    }

    if (
      type ===
        "TEACHER_AVOID_FIRST_PERIOD" &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      firstOrder !==
        undefined &&
      candidate.periodOrders.includes(
        firstOrder,
      )
    ) {
      return false;
    }

    if (
      type ===
        "TEACHER_AVOID_LAST_PERIOD" &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      lastOrder !==
        undefined &&
      candidate.periodOrders.includes(
        lastOrder,
      )
    ) {
      return false;
    }

    if (
      type ===
        "SUBJECT_AVOID_FIRST_PERIOD" &&
      constraint.subjectIds.includes(
        task.subjectId,
      ) &&
      firstOrder !==
        undefined &&
      candidate.periodOrders.includes(
        firstOrder,
      )
    ) {
      return false;
    }

    if (
      type ===
        "SUBJECT_AVOID_LAST_PERIOD" &&
      constraint.subjectIds.includes(
        task.subjectId,
      ) &&
      lastOrder !==
        undefined &&
      candidate.periodOrders.includes(
        lastOrder,
      )
    ) {
      return false;
    }

    if (
      type ===
        "TEACHER_MAX_DAILY" &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const current =
        state.teacherDayCount.get(
          teacherDayKey(
            task.teacherId,
            candidate.dayId,
          ),
        ) ?? 0;

      if (
        current +
          task.length >
        constraint.valueInt
      ) {
        return false;
      }
    }

    if (
      type ===
        "CLASS_MAX_DAILY" &&
      constraint.classIds.includes(
        task.classId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const current =
        state.classDayCount.get(
          classDayKey(
            task.classId,
            candidate.dayId,
          ),
        ) ?? 0;

      if (
        current +
          task.length >
        constraint.valueInt
      ) {
        return false;
      }
    }

    if (
      type ===
        "SUBJECT_MAX_DAILY" &&
      constraint.subjectIds.includes(
        task.subjectId,
      ) &&
      matchesTarget(
        constraint.classIds,
        task.classId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const current =
        state.subjectClassDayCount.get(
          subjectClassDayKey(
            task.classId,
            task.subjectId,
            candidate.dayId,
          ),
        ) ?? 0;

      if (
        current +
          task.length >
        constraint.valueInt
      ) {
        return false;
      }
    }

    if (
      type ===
        "TEACHER_MAX_CONSECUTIVE" &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const periods =
        withCandidatePeriods(
          state,
          state.teacherDayPeriods,
          teacherDayKey(
            task.teacherId,
            candidate.dayId,
          ),
          candidate,
        );

      if (
        longestConsecutive(
          periods,
        ) >
        constraint.valueInt
      ) {
        return false;
      }
    }

    if (
      type ===
        "CLASS_MAX_CONSECUTIVE" &&
      constraint.classIds.includes(
        task.classId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const periods =
        withCandidatePeriods(
          state,
          state.classDayPeriods,
          classDayKey(
            task.classId,
            candidate.dayId,
          ),
          candidate,
        );

      if (
        longestConsecutive(
          periods,
        ) >
        constraint.valueInt
      ) {
        return false;
      }
    }

    if (
      type ===
        "TEACHER_MAX_DAILY_GAPS" &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const periods =
        withCandidatePeriods(
          state,
          state.teacherDayPeriods,
          teacherDayKey(
            task.teacherId,
            candidate.dayId,
          ),
          candidate,
        );

      if (
        countGaps(
          periods,
        ) >
        constraint.valueInt
      ) {
        return false;
      }
    }

    if (
      type ===
        "SUBJECT_MAX_SPREAD_DAYS" &&
      constraint.subjectIds.includes(
        task.subjectId,
      ) &&
      matchesTarget(
        constraint.classIds,
        task.classId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const key =
        subjectClassKey(
          task.classId,
          task.subjectId,
        );

      const days =
        new Set(
          state.subjectClassDays.get(
            key,
          ) ?? [],
        );

      days.add(
        candidate.dayId,
      );

      if (
        days.size >
        constraint.valueInt
      ) {
        return false;
      }
    }

    if (
      type ===
        "SUBJECT_NO_CONSECUTIVE" &&
      constraint.subjectIds.includes(
        task.subjectId,
      ) &&
      matchesTarget(
        constraint.classIds,
        task.classId,
      )
    ) {
      const existing =
        state.subjectClassDayPeriods.get(
          subjectClassDayKey(
            task.classId,
            task.subjectId,
            candidate.dayId,
          ),
        );

      if (existing) {
        for (
          const order of
          candidate.periodOrders
        ) {
          if (
            existing.has(
              order - 1,
            ) ||
            existing.has(
              order + 1,
            )
          ) {
            return false;
          }
        }
      }
    }

    if (
      type ===
        "TEACHER_MAX_FIRST_PERIODS_WEEKLY" &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      constraint.valueInt !==
        null &&
      firstOrder !==
        undefined &&
      candidate.periodOrders.includes(
        firstOrder,
      )
    ) {
      const current =
        state.teacherFirstCount.get(
          task.teacherId,
        ) ?? 0;

      if (
        current + 1 >
        constraint.valueInt
      ) {
        return false;
      }
    }

    if (
      type ===
        "TEACHER_MAX_LAST_PERIODS_WEEKLY" &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      constraint.valueInt !==
        null &&
      lastOrder !==
        undefined &&
      candidate.periodOrders.includes(
        lastOrder,
      )
    ) {
      const current =
        state.teacherLastCount.get(
          task.teacherId,
        ) ?? 0;

      if (
        current + 1 >
        constraint.valueInt
      ) {
        return false;
      }
    }

    if (
      (
        type ===
          "FIXED_ASSIGNMENT" ||
        type ===
          "SUBJECT_FIXED_SLOT"
      ) &&
      targetMatches &&
      task.fixedSlot &&
      !candidateFullyInsideConstraint(
        {
          ...constraint,
          effectiveSlots:
            new Set([
              slotKey(
                task.fixedSlot.dayId,
                task.fixedSlot.periodId,
              ),
            ]),
        },
        {
          ...candidate,
          periodIds: [
            candidate.periodIds[0],
          ],
          periodOrders: [
            candidate.periodOrders[0],
          ],
        },
      )
    ) {
      return false;
    }
  }

  return true;
}

function candidatePenalty(
  problem:
    GenerationProblem,
  constraints:
    PreparedConstraint[],
  state:
    EngineState,
  task:
    GenerationTask,
  candidate:
    Candidate,
) {
  let penalty = 0;

  const firstOrder =
    problem.periods[0]
      ?.order;

  const lastOrder =
    problem.periods[
      problem.periods.length -
        1
    ]?.order;

  for (
    const constraint of
    constraints
  ) {
    if (
      constraint.strength ===
      "HARD"
    ) {
      continue;
    }

    if (
      !matchesTask(
        constraint,
        task,
      )
    ) {
      continue;
    }

    const weight =
      getWeight(
        constraint,
      );

    const inside =
      candidateFullyInsideConstraint(
        constraint,
        candidate,
      );

    if (
      constraint.type ===
        "TEACHER_MAX_DAILY" &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const current =
        state.teacherDayCount.get(
          teacherDayKey(
            task.teacherId,
            candidate.dayId,
          ),
        ) ?? 0;

      const excess =
        Math.max(
          0,
          current +
            task.length -
            constraint.valueInt,
        );

      penalty +=
        excess *
        weight *
        4;
    }

    if (
      constraint.type ===
        "TEACHER_MAX_CONSECUTIVE" &&
      constraint.teacherIds.includes(
        task.teacherId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const projected =
        withCandidatePeriods(
          state,
          state.teacherDayPeriods,
          teacherDayKey(
            task.teacherId,
            candidate.dayId,
          ),
          candidate,
        );

      const excess =
        Math.max(
          0,
          longestConsecutive(
            projected,
          ) -
            constraint.valueInt,
        );

      penalty +=
        excess *
        weight *
        4;
    }

    if (
      constraint.type ===
        "SUBJECT_MAX_DAILY" &&
      constraint.subjectIds.includes(
        task.subjectId,
      ) &&
      matchesTarget(
        constraint.classIds,
        task.classId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const current =
        state.subjectClassDayCount.get(
          subjectClassDayKey(
            task.classId,
            task.subjectId,
            candidate.dayId,
          ),
        ) ?? 0;

      const excess =
        Math.max(
          0,
          current +
            task.length -
            constraint.valueInt,
        );

      penalty +=
        excess *
        weight *
        4;
    }

    if (
      constraint.type ===
        "CLASS_MAX_DAILY" &&
      constraint.classIds.includes(
        task.classId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const current =
        state.classDayCount.get(
          classDayKey(
            task.classId,
            candidate.dayId,
          ),
        ) ?? 0;

      const excess =
        Math.max(
          0,
          current +
            task.length -
            constraint.valueInt,
        );

      penalty +=
        excess *
        weight *
        4;
    }

    if (
      constraint.type ===
        "CLASS_MAX_CONSECUTIVE" &&
      constraint.classIds.includes(
        task.classId,
      ) &&
      constraint.valueInt !==
        null
    ) {
      const projected =
        withCandidatePeriods(
          state,
          state.classDayPeriods,
          classDayKey(
            task.classId,
            candidate.dayId,
          ),
          candidate,
        );

      const excess =
        Math.max(
          0,
          longestConsecutive(
            projected,
          ) -
            constraint.valueInt,
        );

      penalty +=
        excess *
        weight *
        4;
    }

    if (
      [
        "TEACHER_PREFERRED",
        "TEACHER_PREFERRED_DAY",
        "SUBJECT_PREFERRED",
        "CLASS_PREFERRED_SLOT",
        "ASSIGNMENT_PREFERRED_SLOT",
      ].includes(
        constraint.type,
      ) &&
      !inside
    ) {
      penalty +=
        weight;
    }

    if (
      constraint.type ===
        "SUBJECT_EARLY_PERIODS" &&
      constraint.periodIds.length >
        0 &&
      !candidate.periodIds.every(
        (periodId) =>
          constraint.periodIds.includes(
            periodId,
          ),
      )
    ) {
      penalty +=
        weight;
    }

    if (
      constraint.type ===
        "SUBJECT_LATE_PERIODS" &&
      constraint.periodIds.length >
        0 &&
      !candidate.periodIds.every(
        (periodId) =>
          constraint.periodIds.includes(
            periodId,
          ),
      )
    ) {
      penalty +=
        weight;
    }

    if (
      constraint.type ===
        "TEACHER_AVOID_FIRST_PERIOD" &&
      firstOrder !==
        undefined &&
      candidate.periodOrders.includes(
        firstOrder,
      )
    ) {
      penalty +=
        weight;
    }

    if (
      constraint.type ===
        "TEACHER_AVOID_LAST_PERIOD" &&
      lastOrder !==
        undefined &&
      candidate.periodOrders.includes(
        lastOrder,
      )
    ) {
      penalty +=
        weight;
    }

    if (
      constraint.type ===
        "SUBJECT_AVOID_FIRST_PERIOD" &&
      firstOrder !==
        undefined &&
      candidate.periodOrders.includes(
        firstOrder,
      )
    ) {
      penalty +=
        weight;
    }

    if (
      constraint.type ===
        "SUBJECT_AVOID_LAST_PERIOD" &&
      lastOrder !==
        undefined &&
      candidate.periodOrders.includes(
        lastOrder,
      )
    ) {
      penalty +=
        weight;
    }
  }

  const teacherToday =
    state.teacherDayCount.get(
      teacherDayKey(
        task.teacherId,
        candidate.dayId,
      ),
    ) ?? 0;

  penalty +=
    teacherToday;

  const subjectToday =
    state.subjectClassDayCount.get(
      subjectClassDayKey(
        task.classId,
        task.subjectId,
        candidate.dayId,
      ),
    ) ?? 0;

  penalty +=
    subjectToday * 3;

  const teacherOrders =
    new Set([
      ...(
        state.teacherDayPeriods.get(
          teacherDayKey(
            task.teacherId,
            candidate.dayId,
          ),
        ) ?? []
      ),
      ...candidate.periodOrders,
    ]);

  penalty +=
    countGaps(
      teacherOrders,
    ) * 2;

  return penalty;
}

function getCandidates(
  problem:
    GenerationProblem,
  constraints:
    PreparedConstraint[],
  state:
    EngineState,
  task:
    GenerationTask,
  random:
    () => number,
) {
  const candidates:
    Candidate[] =
      [];

  for (
    const day of
    problem.days
  ) {
    if (
      task.fixedDayId &&
      task.fixedDayId !==
        day.id
    ) {
      continue;
    }

    if (
      task.fixedSlot &&
      task.fixedSlot.dayId !==
        day.id
    ) {
      continue;
    }

    for (
      const period of
      problem.periods
    ) {
      if (
        task.fixedSlot &&
        task.fixedSlot.periodId !==
          period.id
      ) {
        continue;
      }

      const block =
        getPeriodBlock(
          problem,
          period,
          task.length,
        );

      if (!block) {
        continue;
      }

      const candidate:
        Candidate = {
          dayId:
            day.id,

          periodIds:
            block.map(
              (item) =>
                item.id,
            ),

          periodOrders:
            block.map(
              (item) =>
                item.order,
            ),

          penalty: 0,

          source:
            task.fixedSource ??
            (
              task.fixedSlot
                ? "FIXED_ASSIGNMENT_JSON"
                : "GENERATED"
            ),

          locked:
            task.fixedSlot
              ?.isLocked ===
              true,
        };

      if (
        !hardAllows(
          problem,
          constraints,
          state,
          task,
          candidate,
        )
      ) {
        continue;
      }

      candidate.penalty =
        candidatePenalty(
          problem,
          constraints,
          state,
          task,
          candidate,
        ) +
        random() *
          0.25;

      candidates.push(
        candidate,
      );
    }
  }

  candidates.sort(
    (a, b) =>
      a.penalty -
      b.penalty,
  );

  return candidates;
}

function placeCandidate(
  problem:
    GenerationProblem,
  state:
    EngineState,
  task:
    GenerationTask,
  candidate:
    Candidate,
) {
  const day =
    problem.days.find(
      (item) =>
        item.id ===
        candidate.dayId,
    );

  if (!day) {
    throw new Error(
      "INVALID_DAY",
    );
  }

  const periods =
    candidate.periodIds.map(
      (periodId) => {
        const period =
          problem.periods.find(
            (item) =>
              item.id ===
              periodId,
          );

        if (!period) {
          throw new Error(
            "INVALID_PERIOD",
          );
        }

        return period;
      },
    );

  const blockId =
    task.id;

  for (
    let index = 0;
    index <
    periods.length;
    index += 1
  ) {
    const period =
      periods[index];

    state.teacherBusy.add(
      teacherSlotKey(
        task.teacherId,
        day.id,
        period.id,
      ),
    );

    state.classBusy.add(
      classSlotKey(
        task.classId,
        day.id,
        period.id,
      ),
    );

    state.sessions.push({
      temporaryId:
        `${task.id}:${index}`,

      blockId,

      blockIndex:
        index,

      blockLength:
        task.length,

      assignmentId:
        task.assignmentId,

      teacherId:
        task.teacherId,

      teacherName:
        task.teacherName,

      classId:
        task.classId,

      className:
        task.className,

      subjectId:
        task.subjectId,

      subjectName:
        task.subjectName,

      dayId:
        day.id,

      dayLabel:
        day.label,

      periodId:
        period.id,

      periodLabel:
        period.label,

      periodOrder:
        period.order,

      isLocked:
        candidate.locked,

      source:
        candidate.source,

      placementScore:
        Math.round(
          candidate.penalty,
        ),
    });
  }

  addCount(
    state.teacherDayCount,
    teacherDayKey(
      task.teacherId,
      day.id,
    ),
    task.length,
  );

  addCount(
    state.classDayCount,
    classDayKey(
      task.classId,
      day.id,
    ),
    task.length,
  );

  addCount(
    state.subjectClassDayCount,
    subjectClassDayKey(
      task.classId,
      task.subjectId,
      day.id,
    ),
    task.length,
  );

  addToSetMap(
    state.teacherDayPeriods,
    teacherDayKey(
      task.teacherId,
      day.id,
    ),
    candidate.periodOrders,
  );

  addToSetMap(
    state.classDayPeriods,
    classDayKey(
      task.classId,
      day.id,
    ),
    candidate.periodOrders,
  );

  addToSetMap(
    state.subjectClassDayPeriods,
    subjectClassDayKey(
      task.classId,
      task.subjectId,
      day.id,
    ),
    candidate.periodOrders,
  );

  const subjectKey =
    subjectClassKey(
      task.classId,
      task.subjectId,
    );

  const subjectDays =
    new Set(
      state.subjectClassDays.get(
        subjectKey,
      ) ?? [],
    );

  subjectDays.add(
    day.id,
  );

  state.subjectClassDays.set(
    subjectKey,
    subjectDays,
  );

  const firstOrder =
    problem.periods[0]
      ?.order;

  const lastOrder =
    problem.periods[
      problem.periods.length -
        1
    ]?.order;

  if (
    firstOrder !==
      undefined &&
    candidate.periodOrders.includes(
      firstOrder,
    )
  ) {
    addCount(
      state.teacherFirstCount,
      task.teacherId,
    );
  }

  if (
    lastOrder !==
      undefined &&
    candidate.periodOrders.includes(
      lastOrder,
    )
  ) {
    addCount(
      state.teacherLastCount,
      task.teacherId,
    );
  }
}

function releaseCandidate(
  problem:
    GenerationProblem,
  state:
    EngineState,
  task:
    GenerationTask,
  candidate:
    Candidate,
) {
  for (
    const periodId of
    candidate.periodIds
  ) {
    state.teacherBusy.delete(
      teacherSlotKey(
        task.teacherId,
        candidate.dayId,
        periodId,
      ),
    );

    state.classBusy.delete(
      classSlotKey(
        task.classId,
        candidate.dayId,
        periodId,
      ),
    );
  }

  state.sessions =
    state.sessions.filter(
      (session) =>
        session.blockId !==
        task.id,
    );

  subtractCount(
    state.teacherDayCount,
    teacherDayKey(
      task.teacherId,
      candidate.dayId,
    ),
    task.length,
  );

  subtractCount(
    state.classDayCount,
    classDayKey(
      task.classId,
      candidate.dayId,
    ),
    task.length,
  );

  subtractCount(
    state.subjectClassDayCount,
    subjectClassDayKey(
      task.classId,
      task.subjectId,
      candidate.dayId,
    ),
    task.length,
  );

  removeFromSetMap(
    state.teacherDayPeriods,
    teacherDayKey(
      task.teacherId,
      candidate.dayId,
    ),
    candidate.periodOrders,
  );

  removeFromSetMap(
    state.classDayPeriods,
    classDayKey(
      task.classId,
      candidate.dayId,
    ),
    candidate.periodOrders,
  );

  removeFromSetMap(
    state.subjectClassDayPeriods,
    subjectClassDayKey(
      task.classId,
      task.subjectId,
      candidate.dayId,
    ),
    candidate.periodOrders,
  );

  const subjectKey =
    subjectClassKey(
      task.classId,
      task.subjectId,
    );

  const stillHasDay =
    state.sessions.some(
      (session) =>
        session.classId ===
          task.classId &&
        session.subjectId ===
          task.subjectId &&
        session.dayId ===
          candidate.dayId,
    );

  if (!stillHasDay) {
    const days =
      new Set(
        state.subjectClassDays.get(
          subjectKey,
        ) ?? [],
      );

    days.delete(
      candidate.dayId,
    );

    if (
      days.size === 0
    ) {
      state.subjectClassDays.delete(
        subjectKey,
      );
    }
    else {
      state.subjectClassDays.set(
        subjectKey,
        days,
      );
    }
  }

  const firstOrder =
    problem.periods[0]
      ?.order;

  const lastOrder =
    problem.periods[
      problem.periods.length -
        1
    ]?.order;

  if (
    firstOrder !==
      undefined &&
    candidate.periodOrders.includes(
      firstOrder,
    )
  ) {
    subtractCount(
      state.teacherFirstCount,
      task.teacherId,
    );
  }

  if (
    lastOrder !==
      undefined &&
    candidate.periodOrders.includes(
      lastOrder,
    )
  ) {
    subtractCount(
      state.teacherLastCount,
      task.teacherId,
    );
  }
}

function variance(
  values: number[],
) {
  if (
    values.length === 0
  ) {
    return 0;
  }

  const mean =
    values.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) /
    values.length;

  return (
    values.reduce(
      (
        sum,
        value,
      ) =>
        sum +
        Math.pow(
          value - mean,
          2,
        ),
      0,
    ) /
    values.length
  );
}

function scoreSchedule(
  problem:
    GenerationProblem,
  constraints:
    PreparedConstraint[],
  sessions:
    GeneratedSession[],
): GenerationScoreBreakdown {
  let preferencePenalty =
    sessions.reduce(
      (sum, session) =>
        sum +
        session.placementScore,
      0,
    );

  let teacherGapPenalty =
    0;

  let classGapPenalty =
    0;

  let subjectSpreadPenalty =
    0;

  let dailyLoadPenalty =
    0;

  for (
    const teacher of
    problem.teachers
  ) {
    const dayLoads:
      number[] =
      [];

    for (
      const day of
      problem.days
    ) {
      const teacherSessions =
        sessions.filter(
          (session) =>
            session.teacherId ===
              teacher.id &&
            session.dayId ===
              day.id,
        );

      dayLoads.push(
        teacherSessions.length,
      );

      teacherGapPenalty +=
        countGaps(
          teacherSessions.map(
            (session) =>
              session.periodOrder,
          ),
        ) * 3;
    }

    dailyLoadPenalty +=
      Math.round(
        variance(
          dayLoads,
        ),
      );
  }

  for (
    const classItem of
    problem.classes
  ) {
    for (
      const day of
      problem.days
    ) {
      const classSessions =
        sessions.filter(
          (session) =>
            session.classId ===
              classItem.id &&
            session.dayId ===
              day.id,
        );

      classGapPenalty +=
        countGaps(
          classSessions.map(
            (session) =>
              session.periodOrder,
          ),
        );
    }
  }

  const assignmentKeys =
    new Set(
      problem.assignments.map(
        (assignment) =>
          subjectClassKey(
            assignment.classId,
            assignment.subjectId,
          ),
      ),
    );

  for (
    const key of
    assignmentKeys
  ) {
    const [
      classId,
      subjectId,
    ] =
      key.split(":");

    const related =
      sessions.filter(
        (session) =>
          session.classId ===
            classId &&
          session.subjectId ===
            subjectId,
      );

    const distinctDays =
      new Set(
        related.map(
          (session) =>
            session.dayId,
        ),
      ).size;

    const idealDays =
      Math.min(
        problem.days.length,
        related.length,
      );

    subjectSpreadPenalty +=
      Math.max(
        0,
        idealDays -
          distinctDays,
      ) * 2;
  }

  const firstOrder =
    problem.periods[0]
      ?.order;

  const lastOrder =
    problem.periods[
      problem.periods.length -
        1
    ]?.order;

  const firstCounts =
    problem.teachers.map(
      (teacher) =>
        sessions.filter(
          (session) =>
            session.teacherId ===
              teacher.id &&
            session.periodOrder ===
              firstOrder,
        ).length,
    );

  const lastCounts =
    problem.teachers.map(
      (teacher) =>
        sessions.filter(
          (session) =>
            session.teacherId ===
              teacher.id &&
            session.periodOrder ===
              lastOrder,
        ).length,
    );

  const firstPeriodFairnessPenalty =
    Math.round(
      variance(
        firstCounts,
      ) * 2,
    );

  const lastPeriodFairnessPenalty =
    Math.round(
      variance(
        lastCounts,
      ) * 2,
    );

  for (
    const constraint of
    constraints
  ) {
    if (
      constraint.strength ===
      "HARD"
    ) {
      continue;
    }

    if (
      constraint.type ===
        "TEACHER_MIN_DAILY" &&
      constraint.valueInt !==
        null
    ) {
      const weight =
        getWeight(
          constraint,
        );

      for (
        const teacherId of
        constraint.teacherIds
      ) {
        for (
          const day of
          problem.days
        ) {
          const count =
            sessions.filter(
              (session) =>
                session.teacherId ===
                  teacherId &&
                session.dayId ===
                  day.id,
            ).length;

          if (
            count > 0 &&
            count <
              constraint.valueInt
          ) {
            preferencePenalty +=
              (
                constraint.valueInt -
                count
              ) *
              weight *
              3;
          }
        }
      }
    }

    if (
      constraint.type ===
        "NO_ISOLATED_PERIOD"
    ) {
      const weight =
        getWeight(
          constraint,
        );

      for (
        const subjectId of
        constraint.subjectIds
      ) {
        for (
          const classItem of
          problem.classes
        ) {
          if (
            constraint.classIds.length >
              0 &&
            !constraint.classIds.includes(
              classItem.id,
            )
          ) {
            continue;
          }

          for (
            const day of
            problem.days
          ) {
            const count =
              sessions.filter(
                (session) =>
                  session.subjectId ===
                    subjectId &&
                  session.classId ===
                    classItem.id &&
                  session.dayId ===
                    day.id,
              ).length;

            if (
              count === 1
            ) {
              preferencePenalty +=
                weight * 3;
            }
          }
        }
      }
    }

    if (
      constraint.type ===
        "FAIR_SUBJECT_SPREAD"
    ) {
      const weight =
        getWeight(
          constraint,
        );

      for (
        const subjectId of
        constraint.subjectIds
      ) {
        for (
          const classItem of
          problem.classes
        ) {
          if (
            constraint.classIds.length >
              0 &&
            !constraint.classIds.includes(
              classItem.id,
            )
          ) {
            continue;
          }

          const related =
            sessions.filter(
              (session) =>
                session.subjectId ===
                  subjectId &&
                session.classId ===
                  classItem.id,
            );

          if (
            related.length === 0
          ) {
            continue;
          }

          const days =
            new Set(
              related.map(
                (session) =>
                  session.dayId,
              ),
            ).size;

          const ideal =
            Math.min(
              problem.days.length,
              related.length,
            );

          preferencePenalty +=
            Math.max(
              0,
              ideal - days,
            ) *
            weight;
        }
      }
    }

    if (
      constraint.type ===
        "FAIR_TEACHER_GAPS"
    ) {
      teacherGapPenalty +=
        Math.round(
          teacherGapPenalty *
            (
              getWeight(
                constraint,
              ) /
              100
            ),
        );
    }
  }

  preferencePenalty =
    Math.round(
      preferencePenalty,
    );

  const totalPenalty =
    preferencePenalty +
    teacherGapPenalty +
    classGapPenalty +
    subjectSpreadPenalty +
    firstPeriodFairnessPenalty +
    lastPeriodFairnessPenalty +
    dailyLoadPenalty;

  const divisor =
    Math.max(
      1,
      sessions.length,
    );

  const normalized =
    totalPenalty /
    divisor;

  const score =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
          normalized * 2,
        ),
      ),
    );

  return {
    preferencePenalty,
    teacherGapPenalty,
    classGapPenalty,
    subjectSpreadPenalty,
    firstPeriodFairnessPenalty,
    lastPeriodFairnessPenalty,
    dailyLoadPenalty,
    totalPenalty,
    score,
  };
}

function finalHardChecks(
  problem:
    GenerationProblem,
  constraints:
    PreparedConstraint[],
  sessions:
    GeneratedSession[],
) {
  const diagnostics:
    GenerationDiagnostic[] =
      [];

  for (
    const constraint of
    constraints
  ) {
    if (
      constraint.strength !==
      "HARD"
    ) {
      continue;
    }

    if (
      constraint.type ===
        "SUBJECT_MIN_SPREAD_DAYS" &&
      constraint.valueInt !==
        null
    ) {
      for (
        const subjectId of
        constraint.subjectIds
      ) {
        for (
          const classItem of
          problem.classes
        ) {
          if (
            constraint.classIds.length >
              0 &&
            !constraint.classIds.includes(
              classItem.id,
            )
          ) {
            continue;
          }

          const matching =
            sessions.filter(
              (session) =>
                session.subjectId ===
                  subjectId &&
                session.classId ===
                  classItem.id,
            );

          if (
            matching.length === 0
          ) {
            continue;
          }

          const days =
            new Set(
              matching.map(
                (session) =>
                  session.dayId,
              ),
            ).size;

          if (
            days <
            constraint.valueInt
          ) {
            diagnostics.push({
              code:
                "SUBJECT_MIN_SPREAD_DAYS_UNSATISFIED",

              level:
                "ERROR",

              title:
                "توزيع المادة غير كافٍ",

              description:
                `المادة تحتاج الانتشار على ${constraint.valueInt} أيام على الأقل.`,

              constraintId:
                constraint.id,
            });
          }
        }
      }
    }
  }

  return diagnostics;
}

function runAttempt(
  problem:
    GenerationProblem,
  constraints:
    PreparedConstraint[],
  allTasks:
    GenerationTask[],
  seed: number,
  options:
    GenerationOptions,
): GenerationAttemptResult {
  const random =
    createRandom(seed);

  const state =
    createState();

  const remaining =
    [...allTasks];

  const maxNodes =
    options.maxNodesPerAttempt ??
    12000;

  const maxCandidates =
    options.maxCandidatesPerTask ??
    8;

  let nodes = 0;

  let bestPartial:
    GeneratedSession[] =
      [];

  function search():
    boolean {
    nodes += 1;

    if (
      state.sessions.length >
      bestPartial.length
    ) {
      bestPartial =
        state.sessions.map(
          (session) => ({
            ...session,
          }),
        );
    }

    if (
      remaining.length ===
      0
    ) {
      return (
        validateGeneratedTimetableV2(
          problem,
          state.sessions,
        ).valid
      );
    }

    if (
      nodes >
      maxNodes
    ) {
      return false;
    }

    let selectedIndex =
      -1;

    let selectedCandidates:
      Candidate[] | null =
      null;

    for (
      let index = 0;
      index <
      remaining.length;
      index += 1
    ) {
      const task =
        remaining[index];

      const candidates =
        getCandidates(
          problem,
          constraints,
          state,
          task,
          random,
        );

      if (
        candidates.length ===
        0
      ) {
        return false;
      }

      if (
        selectedCandidates ===
          null ||
        candidates.length <
          selectedCandidates.length
      ) {
        selectedIndex =
          index;

        selectedCandidates =
          candidates;

        if (
          candidates.length ===
          1
        ) {
          break;
        }
      }
    }

    if (
      selectedIndex <
        0 ||
      !selectedCandidates
    ) {
      return false;
    }

    const [
      task,
    ] =
      remaining.splice(
        selectedIndex,
        1,
      );

    const limit =
      Math.min(
        maxCandidates,
        selectedCandidates.length,
      );

    for (
      let index = 0;
      index < limit;
      index += 1
    ) {
      const candidate =
        selectedCandidates[
          index
        ];

      placeCandidate(
        problem,
        state,
        task,
        candidate,
      );

      if (
        search()
      ) {
        return true;
      }

      releaseCandidate(
        problem,
        state,
        task,
        candidate,
      );

      if (
        nodes >
        maxNodes
      ) {
        break;
      }
    }

    remaining.splice(
      selectedIndex,
      0,
      task,
    );

    return false;
  }

  const solved =
    search();

  const sessions =
    solved
      ? state.sessions
      : bestPartial;

  const requiredSessions =
    problem.assignments.reduce(
      (sum, assignment) =>
        sum +
        assignment.assignedLessons,
      0,
    );

  const scheduledSessions =
    sessions.length;

  const unscheduledSessions =
    Math.max(
      0,
      requiredSessions -
      scheduledSessions,
    );

  const completeness =
    requiredSessions === 0
      ? 100
      : Math.round(
          (
            scheduledSessions /
            requiredSessions
          ) *
          100,
        );

  const finalHard =
    solved
      ? finalHardChecks(
          problem,
          constraints,
          sessions,
        )
      : [];

  const validation =
    solved
      ? validateGeneratedTimetableV2(
          problem,
          sessions,
        )
      : {
          valid: false,
          hardViolationCount:
            unscheduledSessions,
          issues: [],
        };

  const scoreBreakdown =
    scoreSchedule(
      problem,
      constraints,
      sessions,
    );

  const complete =
    solved &&
    unscheduledSessions ===
      0 &&
    validation.valid &&
    finalHard.length ===
      0;

  const diagnostics:
    GenerationDiagnostic[] =
      [
        ...finalHard,
      ];

  if (!solved) {
    diagnostics.push({
      code:
        nodes >
        maxNodes
          ? "SEARCH_BUDGET_EXHAUSTED"
          : "NO_COMPLETE_SOLUTION",

      level:
        "WARNING",

      title:
        nodes >
        maxNodes
          ? "انتهت ميزانية البحث"
          : "لم تكتمل المحاولة",

      description:
        `تم توزيع ${scheduledSessions} من ${requiredSessions} حصة في هذه المحاولة.`,
    });
  }

  if (
    solved &&
    !validation.valid
  ) {
    diagnostics.push({
      code:
        "POST_GENERATION_VALIDATION_FAILED",

      level:
        "ERROR",

      title:
        "فشل التحقق النهائي",

      description:
        `اكتشف المدقق المستقل ${validation.hardViolationCount} مخالفة بعد التوليد.`,
    });
  }

  return {
    complete,

    sessions,

    requiredSessions,
    scheduledSessions,
    unscheduledSessions,

    completeness,

    softPenalty:
      scoreBreakdown.totalPenalty,

    score:
      scoreBreakdown.score,

    scoreBreakdown,

    validation,

    diagnostics,
  };
}

function betterThan(
  candidate:
    GenerationAttemptResult,
  current:
    GenerationAttemptResult | null,
) {
  if (!current) {
    return true;
  }

  if (
    candidate.complete !==
    current.complete
  ) {
    return candidate.complete;
  }

  if (
    candidate.scheduledSessions !==
    current.scheduledSessions
  ) {
    return (
      candidate.scheduledSessions >
      current.scheduledSessions
    );
  }

  if (
    candidate.validation
      .hardViolationCount !==
    current.validation
      .hardViolationCount
  ) {
    return (
      candidate.validation
        .hardViolationCount <
      current.validation
        .hardViolationCount
    );
  }

  if (
    candidate.score !==
    current.score
  ) {
    return (
      candidate.score >
      current.score
    );
  }

  return (
    candidate.softPenalty <
    current.softPenalty
  );
}

function emptyAttempt():
  GenerationAttemptResult {
  const scoreBreakdown:
    GenerationScoreBreakdown =
      {
        preferencePenalty: 0,
        teacherGapPenalty: 0,
        classGapPenalty: 0,
        subjectSpreadPenalty: 0,
        firstPeriodFairnessPenalty:
          0,
        lastPeriodFairnessPenalty:
          0,
        dailyLoadPenalty: 0,
        totalPenalty: 0,
        score: 0,
      };

  return {
    complete: false,

    sessions: [],

    requiredSessions: 0,
    scheduledSessions: 0,
    unscheduledSessions: 0,

    completeness: 0,

    softPenalty: 0,
    score: 0,

    scoreBreakdown,

    validation: {
      valid: false,
      hardViolationCount: 0,
      issues: [],
    },

    diagnostics: [],
  };
}

export function generateTimetableV2(
  problem:
    GenerationProblem,
  options:
    GenerationOptions,
): GenerationResult {
  const startedAt =
    Date.now();

  const constraints =
    prepareConstraints(
      problem,
    );

  const catalogContractIssues =
    getGenerationCatalogCompatibilityIssues();

  const unsupported =
    constraints.filter(
      (constraint) => {
        if (
          constraint.strength ===
          "HARD"
        ) {
          return (
            !SUPPORTED_HARD_GENERATION_CONSTRAINTS.has(
              constraint.type,
            )
          );
        }

        if (
          constraint.strength ===
          "SOFT"
        ) {
          return (
            !SUPPORTED_SOFT_GENERATION_CONSTRAINTS.has(
              constraint.type,
            )
          );
        }

        return true;
      },
    );

  const build =
    buildTasks(
      problem,
      constraints,
    );

  const preflightDiagnostics:
    GenerationDiagnostic[] =
      [
        ...build.diagnostics,

        ...catalogContractIssues.map(
          (
            issue,
          ): GenerationDiagnostic => ({
            code:
              "CONSTRAINT_CATALOG_ENGINE_MISMATCH",

            level:
              "ERROR",

            title:
              "عقد القيود غير متطابق",

            description:
              `القيد ${issue.type} بصيغة ${issue.strength} موجود في الواجهة لكنه غير مدعوم بالكامل داخل المحرك. النوع الداخلي: ${issue.canonicalType}.`,
          }),
        ),

        ...unsupported.map(
          (
            constraint,
          ): GenerationDiagnostic => ({
            code:
              "UNSUPPORTED_HARD_CONSTRAINT",

            level:
              "ERROR",

            title:
              constraint.strength ===
                "HARD"
                ? "قيد إلزامي غير مدعوم من المحرك"
                : "قيد تفضيلي غير مدعوم من المحرك",

            description:
              `نوع القيد ${constraint.type} (${constraint.strength}) غير مدعوم في Engine 1.2، لذلك لن يتم تجاهله بصمت.`,

            constraintId:
              constraint.id,
          }),
        ),
      ];

  if (
    preflightDiagnostics.some(
      (item) =>
        item.level ===
        "ERROR",
    )
  ) {
    const best =
      emptyAttempt();

    best.requiredSessions =
      problem.assignments.reduce(
        (sum, assignment) =>
          sum +
          assignment.assignedLessons,
        0,
      );

    best.unscheduledSessions =
      best.requiredSessions;

    return {
      success: false,

      seed:
        options.seed,

      attemptCount: 0,
      completedAttempts: 0,

      durationMs:
        Date.now() -
        startedAt,

      best,

      diagnostics:
        preflightDiagnostics,
    };
  }

  const attempts =
    Math.max(
      1,
      Math.min(
        60,
        Math.floor(
          options.attempts,
        ),
      ),
    );

  let best:
    GenerationAttemptResult | null =
      null;

  let completedAttempts =
    0;

  for (
    let index = 0;
    index < attempts;
    index += 1
  ) {
    const seed =
      (
        options.seed +
        index *
          104729
      ) >>> 0;

    const result =
      runAttempt(
        problem,
        constraints,
        build.tasks,
        seed,
        options,
      );

    if (
      result.complete
    ) {
      completedAttempts +=
        1;
    }

    if (
      betterThan(
        result,
        best,
      )
    ) {
      best =
        result;
    }

    if (
      result.complete &&
      result.score >= 99
    ) {
      break;
    }
  }

  const finalBest =
    best ??
    emptyAttempt();

  const diagnostics = [
    ...preflightDiagnostics,
    ...finalBest.diagnostics,
  ];

  if (
    !finalBest.complete
  ) {
    diagnostics.push({
      code:
        "GENERATION_NOT_COMPLETE",

      level:
        "ERROR",

      title:
        "لم يكتمل الجدول",

      description:
        `أفضل محاولة وزعت ${finalBest.scheduledSessions} من ${finalBest.requiredSessions} حصة.`,
    });
  }

  return {
    success:
      finalBest.complete,

    seed:
      options.seed,

    attemptCount:
      attempts,

    completedAttempts,

    durationMs:
      Date.now() -
      startedAt,

    best:
      finalBest,

    diagnostics,
  };
}