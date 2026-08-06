import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  TimetableConstraint,
} from "@/lib/timetable/timetable-constraint-types";
import { validateTimetableProject } from "@/lib/timetable/timetable-validation-service";

type Day = {
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

type UnavailableSlot = {
  dayId: string;
  periodId: string;
};

type FixedSlot = {
  dayId: string;
  periodId: string;
  isLocked?: boolean;
};

type LessonTask = {
  id: string;
  assignmentId: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  length: 1 | 2;
  fixedSlot?: FixedSlot;
};

type Candidate = {
  day: Day;
  periods: Period[];
};

type Placement = {
  day: Day;
  periods: Period[];
};

type GenerationState = {
  teacherBusy: Set<string>;
  classBusy: Set<string>;
  subjectDayCount: Map<string, number>;
  teacherDayPeriods: Map<string, Set<number>>;
  classDayPeriods: Map<string, Set<number>>;
  heavySubjectDayCount: Map<string, number>;
  firstPeriodCount: Map<string, number>;
  lastPeriodCount: Map<string, number>;
};

export type GeneratedTimetableSession = {
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

export async function generateTimetable(
  projectId: string,
  schoolAccountId: string,
) {
  const validation = await validateTimetableProject(
    projectId,
    schoolAccountId,
  );

  if (!validation.found) {
    return {
      found: false as const,
      success: false as const,
      errors: ["مشروع الجدول غير موجود."],
      sessions: [] as GeneratedTimetableSession[],
    };
  }

  const blockingErrors = validation.issues.filter(
    (issue) => issue.level === "ERROR",
  );

  if (blockingErrors.length) {
    return {
      found: true as const,
      success: false as const,
      errors: blockingErrors.map(
        (issue) => issue.message,
      ),
      sessions: [] as GeneratedTimetableSession[],
    };
  }

  const project = await prisma.timetableProject.findFirst({
    where: {
      id: projectId,
      schoolAccountId,
    },
    include: {
      teachers: true,
      assignments: {
        include: {
          teacher: true,
          class: true,
          subject: true,
        },
      },
    },
  });

  if (!project) {
    return {
      found: false as const,
      success: false as const,
      errors: ["مشروع الجدول غير موجود."],
      sessions: [] as GeneratedTimetableSession[],
    };
  }

  const days = normalizeDays(project.daysJson)
    .sort((first, second) => first.order - second.order);

  const periods = normalizePeriods(project.periodsJson)
    .filter((period) => !period.isBreak)
    .sort((first, second) => first.order - second.order);

  const periodIndexById = new Map(
    periods.map((period, index) => [
      period.id,
      index,
    ]),
  );

  const settings = normalizeRecord(
    project.settingsJson,
  );

  const constraintsSettings = normalizeRecord(
    settings.constraints,
  );

  const constraints = normalizeConstraints(
    constraintsSettings.items,
  ).filter((constraint) => constraint.isEnabled);

  const hardConstraints = constraints.filter(
    (constraint) => constraint.level === "HARD",
  );

  const preferredConstraints = constraints.filter(
    (constraint) =>
      constraint.level === "PREFERRED",
  );

  const unavailableByTeacher =
    createTeacherUnavailableMap(
      project.teachers,
      hardConstraints,
      days,
      periods,
      periodIndexById,
    );

  const tasks = createTasks(
    project.assignments,
    hardConstraints,
  );

  const teacherTaskCounts = new Map<string, number>();
  const classTaskCounts = new Map<string, number>();

  for (const task of tasks) {
    teacherTaskCounts.set(
      task.teacherId,
      (teacherTaskCounts.get(task.teacherId) || 0) +
        task.length,
    );

    classTaskCounts.set(
      task.classId,
      (classTaskCounts.get(task.classId) || 0) +
        task.length,
    );
  }

  tasks.sort((first, second) => {
    if (first.fixedSlot && !second.fixedSlot) {
      return -1;
    }

    if (!first.fixedSlot && second.fixedSlot) {
      return 1;
    }

    const firstUnavailable =
      unavailableByTeacher.get(first.teacherId)?.size ||
      0;

    const secondUnavailable =
      unavailableByTeacher.get(second.teacherId)?.size ||
      0;

    if (firstUnavailable !== secondUnavailable) {
      return secondUnavailable - firstUnavailable;
    }

    const firstTeacherLoad =
      teacherTaskCounts.get(first.teacherId) || 0;

    const secondTeacherLoad =
      teacherTaskCounts.get(second.teacherId) || 0;

    if (firstTeacherLoad !== secondTeacherLoad) {
      return secondTeacherLoad - firstTeacherLoad;
    }

    const firstClassLoad =
      classTaskCounts.get(first.classId) || 0;

    const secondClassLoad =
      classTaskCounts.get(second.classId) || 0;

    if (firstClassLoad !== secondClassLoad) {
      return secondClassLoad - firstClassLoad;
    }

    if (first.length !== second.length) {
      return second.length - first.length;
    }

    return first.id.localeCompare(second.id);
  });

  const state: GenerationState = {
    teacherBusy: new Set(),
    classBusy: new Set(),
    subjectDayCount: new Map(),
    teacherDayPeriods: new Map(),
    classDayPeriods: new Map(),
    heavySubjectDayCount: new Map(),
    firstPeriodCount: new Map(),
    lastPeriodCount: new Map(),
  };

  const placements = new Map<string, Placement>();
  const deadline = Date.now() + 60000;
  let timedOut = false;

  function placeTask(index: number): boolean {
    if (Date.now() > deadline) {
      timedOut = true;
      return false;
    }

    if (index >= tasks.length) {
      return passesFinalHardConstraints(
        state,
        hardConstraints,
        days,
        periods,
      );
    }

    const task = tasks[index];

    const candidates = createCandidates(
      task,
      days,
      periods,
    );

    candidates.sort(
      (first, second) =>
        scoreCandidate(
          task,
          first,
          state,
          preferredConstraints,
          periods,
          periodIndexById,
        ) -
        scoreCandidate(
          task,
          second,
          state,
          preferredConstraints,
          periods,
          periodIndexById,
        ),
    );

    for (const candidate of candidates) {
      if (
        !canPlace(
          task,
          candidate,
          state,
          unavailableByTeacher,
          hardConstraints,
          periods,
          periodIndexById,
        )
      ) {
        continue;
      }

      occupy(
        task,
        candidate,
        state,
        hardConstraints,
        periods,
        periodIndexById,
      );

      placements.set(task.id, candidate);

      if (placeTask(index + 1)) {
        return true;
      }

      placements.delete(task.id);

      release(
        task,
        candidate,
        state,
        hardConstraints,
        periods,
        periodIndexById,
      );
    }

    return false;
  }

  const solved = placeTask(0);

  if (!solved) {
    return {
      found: true as const,
      success: false as const,
      errors: [
        timedOut
          ? "انتهت مهلة البحث قبل الوصول إلى حل. حاول مرة أخرى أو خفف عدد القيود الإلزامية."
          : "تعذر إنشاء جدول يحقق جميع القيود الإلزامية. راجع القيود المتعارضة أو خفف بعضها إلى تفضيلية.",
      ],
      sessions: [] as GeneratedTimetableSession[],
    };
  }

  const sessions: GeneratedTimetableSession[] = [];

  for (const task of tasks) {
    const placement = placements.get(task.id);

    if (!placement) {
      continue;
    }

    placement.periods.forEach(
      (period, blockIndex) => {
        sessions.push({
          id: `${task.id}:${blockIndex}`,
          assignmentId: task.assignmentId,
          teacherId: task.teacherId,
          teacherName: task.teacherName,
          classId: task.classId,
          className: task.className,
          subjectId: task.subjectId,
          subjectName: task.subjectName,
          dayId: placement.day.id,
          dayLabel: placement.day.label,
          periodId: period.id,
          periodLabel: period.label,
          periodOrder: period.order,
          blockIndex,
          blockLength: task.length,
          isLocked:
            task.fixedSlot?.isLocked === true,
        });
      },
    );
  }

  sessions.sort((first, second) => {
    const firstDay = days.findIndex(
      (day) => day.id === first.dayId,
    );

    const secondDay = days.findIndex(
      (day) => day.id === second.dayId,
    );

    if (firstDay !== secondDay) {
      return firstDay - secondDay;
    }

    return first.periodOrder - second.periodOrder;
  });

  return {
    found: true as const,
    success: true as const,
    errors: [] as string[],
    sessions,
  };
}

function createTasks(
  assignments: Array<{
    id: string;
    teacherId: string;
    classId: string;
    subjectId: string;
    singlePeriods: number;
    doublePeriods: number;
    fixedSlotsJson: unknown;
    teacher: {
      name: string;
    };
    class: {
      name: string;
    };
    subject: {
      name: string;
    };
  }>,
  hardConstraints: TimetableConstraint[],
) {
  const tasks: LessonTask[] = [];

  for (const assignment of assignments) {
    const existingFixedSlots = normalizeFixedSlots(
      assignment.fixedSlotsJson,
    );

    let fixedIndex = 0;

    for (
      let blockNumber = 0;
      blockNumber < assignment.doublePeriods;
      blockNumber += 1
    ) {
      tasks.push({
        id: `${assignment.id}:double:${blockNumber}`,
        assignmentId: assignment.id,
        teacherId: assignment.teacherId,
        teacherName: assignment.teacher.name,
        classId: assignment.classId,
        className: assignment.class.name,
        subjectId: assignment.subjectId,
        subjectName: assignment.subject.name,
        length: 2,
        fixedSlot: existingFixedSlots[fixedIndex],
      });

      fixedIndex += 1;
    }

    for (
      let lessonNumber = 0;
      lessonNumber < assignment.singlePeriods;
      lessonNumber += 1
    ) {
      tasks.push({
        id: `${assignment.id}:single:${lessonNumber}`,
        assignmentId: assignment.id,
        teacherId: assignment.teacherId,
        teacherName: assignment.teacher.name,
        classId: assignment.classId,
        className: assignment.class.name,
        subjectId: assignment.subjectId,
        subjectName: assignment.subject.name,
        length: 1,
        fixedSlot: existingFixedSlots[fixedIndex],
      });

      fixedIndex += 1;
    }
  }

  const fixedSubjectConstraints = hardConstraints.filter(
    (constraint) =>
      constraint.type === "SUBJECT_FIXED_SLOT" &&
      constraint.subjectId &&
      constraint.dayId &&
      constraint.periodId,
  );

  for (const constraint of fixedSubjectConstraints) {
    const task = tasks.find(
      (item) =>
        !item.fixedSlot &&
        item.subjectId === constraint.subjectId &&
        (
          !constraint.classId ||
          item.classId === constraint.classId
        ),
    );

    if (!task) {
      continue;
    }

    task.fixedSlot = {
      dayId: constraint.dayId!,
      periodId: constraint.periodId!,
      isLocked: constraint.isLocked !== false,
    };
  }

  return tasks;
}

function createTeacherUnavailableMap(
  teachers: Array<{
    id: string;
    unavailableSlotsJson: unknown;
  }>,
  hardConstraints: TimetableConstraint[],
  days: Day[],
  periods: Period[],
  periodIndexById: Map<string, number>,
) {
  const result = new Map<string, Set<string>>();

  for (const teacher of teachers) {
    const unavailable = new Set(
      normalizeUnavailableSlots(
        teacher.unavailableSlotsJson,
      ).map(
        (slot) =>
          `${slot.dayId}:${slot.periodId}`,
      ),
    );

    const teacherConstraints =
      hardConstraints.filter(
        (constraint) =>
          constraint.teacherId === teacher.id,
      );

    for (const constraint of teacherConstraints) {
      if (
        constraint.type ===
          "TEACHER_UNAVAILABLE_SLOT" &&
        constraint.dayId &&
        constraint.periodId
      ) {
        unavailable.add(
          `${constraint.dayId}:${constraint.periodId}`,
        );
      }

      if (
        constraint.type === "TEACHER_DAY_OFF" &&
        constraint.dayId
      ) {
        for (const period of periods) {
          unavailable.add(
            `${constraint.dayId}:${period.id}`,
          );
        }
      }

      if (
        constraint.type ===
          "TEACHER_NOT_BEFORE_PERIOD" &&
        constraint.periodId
      ) {
        const limit =
          periodIndexById.get(
            constraint.periodId,
          );

        if (limit !== undefined) {
          for (const day of days) {
            for (
              let index = 0;
              index < limit;
              index += 1
            ) {
              unavailable.add(
                `${day.id}:${periods[index].id}`,
              );
            }
          }
        }
      }

      if (
        constraint.type ===
          "TEACHER_NOT_AFTER_PERIOD" &&
        constraint.periodId
      ) {
        const limit =
          periodIndexById.get(
            constraint.periodId,
          );

        if (limit !== undefined) {
          for (const day of days) {
            for (
              let index = limit + 1;
              index < periods.length;
              index += 1
            ) {
              unavailable.add(
                `${day.id}:${periods[index].id}`,
              );
            }
          }
        }
      }
    }

    result.set(teacher.id, unavailable);
  }

  return result;
}

function createCandidates(
  task: LessonTask,
  days: Day[],
  periods: Period[],
): Candidate[] {
  if (task.fixedSlot) {
    const day = days.find(
      (item) =>
        item.id === task.fixedSlot?.dayId,
    );

    const periodIndex = periods.findIndex(
      (item) =>
        item.id === task.fixedSlot?.periodId,
    );

    if (!day || periodIndex < 0) {
      return [];
    }

    const selectedPeriods = periods.slice(
      periodIndex,
      periodIndex + task.length,
    );

    if (
      selectedPeriods.length !== task.length ||
      !arePeriodsConsecutive(selectedPeriods)
    ) {
      return [];
    }

    return [
      {
        day,
        periods: selectedPeriods,
      },
    ];
  }

  const candidates: Candidate[] = [];

  for (const day of days) {
    for (
      let index = 0;
      index < periods.length;
      index += 1
    ) {
      const selectedPeriods = periods.slice(
        index,
        index + task.length,
      );

      if (
        selectedPeriods.length !== task.length ||
        !arePeriodsConsecutive(selectedPeriods)
      ) {
        continue;
      }

      candidates.push({
        day,
        periods: selectedPeriods,
      });
    }
  }

  return candidates;
}

function canPlace(
  task: LessonTask,
  candidate: Candidate,
  state: GenerationState,
  unavailableByTeacher: Map<string, Set<string>>,
  hardConstraints: TimetableConstraint[],
  periods: Period[],
  periodIndexById: Map<string, number>,
) {
  const unavailable =
    unavailableByTeacher.get(task.teacherId) ||
    new Set<string>();

  for (const period of candidate.periods) {
    const slot =
      `${candidate.day.id}:${period.id}`;

    if (unavailable.has(slot)) {
      return false;
    }

    if (
      state.teacherBusy.has(
        `${task.teacherId}:${slot}`,
      ) ||
      state.classBusy.has(
        `${task.classId}:${slot}`,
      )
    ) {
      return false;
    }

    if (
      hardConstraints.some(
        (constraint) =>
          constraint.type ===
            "SCHOOL_BLOCKED_SLOT" &&
          constraint.dayId === candidate.day.id &&
          constraint.periodId === period.id,
      )
    ) {
      return false;
    }

    if (
      hardConstraints.some(
        (constraint) =>
          constraint.type ===
            "SUBJECT_FORBIDDEN_SLOT" &&
          constraint.subjectId === task.subjectId &&
          (
            !constraint.dayId ||
            constraint.dayId === candidate.day.id
          ) &&
          constraint.periodId === period.id,
      )
    ) {
      return false;
    }
  }

  const teacherDayKey =
    `${task.teacherId}:${candidate.day.id}`;

  const existingTeacherPeriods =
    state.teacherDayPeriods.get(teacherDayKey) ||
    new Set<number>();

  const nextTeacherPeriods = new Set(
    existingTeacherPeriods,
  );

  for (const period of candidate.periods) {
    const index = periodIndexById.get(period.id);

    if (index !== undefined) {
      nextTeacherPeriods.add(index);
    }
  }

  const maxDailyConstraint = findConstraint(
    hardConstraints,
    "TEACHER_MAX_DAILY_PERIODS",
    "teacherId",
    task.teacherId,
  );

  if (
    maxDailyConstraint?.value !== undefined &&
    nextTeacherPeriods.size >
      maxDailyConstraint.value
  ) {
    return false;
  }

  const maxConsecutiveConstraint = findConstraint(
    hardConstraints,
    "TEACHER_MAX_CONSECUTIVE_PERIODS",
    "teacherId",
    task.teacherId,
  );

  if (
    maxConsecutiveConstraint?.value !== undefined &&
    getMaxConsecutive(nextTeacherPeriods) >
      maxConsecutiveConstraint.value
  ) {
    return false;
  }

  const subjectDailyConstraints =
    hardConstraints.filter(
      (constraint) =>
        constraint.type ===
          "SUBJECT_MAX_DAILY_OCCURRENCES" &&
        constraint.subjectId === task.subjectId,
    );

  for (const constraint of subjectDailyConstraints) {
    const key =
      `${task.classId}:${task.subjectId}:${candidate.day.id}`;

    const nextCount =
      (state.subjectDayCount.get(key) || 0) +
      candidate.periods.length;

    if (
      constraint.value !== undefined &&
      nextCount > constraint.value
    ) {
      return false;
    }
  }

  const heavyConstraints = hardConstraints.filter(
    (constraint) =>
      constraint.type ===
        "CLASS_MAX_HEAVY_SUBJECTS_DAILY" &&
      (
        !constraint.classId ||
        constraint.classId === task.classId
      ) &&
      constraint.subjectIds?.includes(
        task.subjectId,
      ),
  );

  for (const constraint of heavyConstraints) {
    const key =
      `${task.classId}:${candidate.day.id}:${constraint.id}`;

    const current =
      state.heavySubjectDayCount.get(key) || 0;

    if (
      constraint.value !== undefined &&
      current + 1 > constraint.value
    ) {
      return false;
    }
  }

  return true;
}

function passesFinalHardConstraints(
  state: GenerationState,
  hardConstraints: TimetableConstraint[],
  days: Day[],
  periods: Period[],
) {
  for (const constraint of hardConstraints) {
    if (
      constraint.type ===
        "TEACHER_MAX_DAILY_GAPS" &&
      constraint.teacherId &&
      constraint.value !== undefined
    ) {
      for (const day of days) {
        const indexes =
          state.teacherDayPeriods.get(
            `${constraint.teacherId}:${day.id}`,
          ) || new Set<number>();

        if (
          countGaps(indexes) >
          constraint.value
        ) {
          return false;
        }
      }
    }

    if (
      constraint.type ===
      "CLASS_NO_INTERNAL_GAPS"
    ) {
      const classIds = constraint.classId
        ? [constraint.classId]
        : getClassIdsFromState(state);

      for (const classId of classIds) {
        for (const day of days) {
          const indexes =
            state.classDayPeriods.get(
              `${classId}:${day.id}`,
            ) || new Set<number>();

          if (countGaps(indexes) > 0) {
            return false;
          }
        }
      }
    }
  }

  return periods.length > 0;
}

function scoreCandidate(
  task: LessonTask,
  candidate: Candidate,
  state: GenerationState,
  preferredConstraints: TimetableConstraint[],
  periods: Period[],
  periodIndexById: Map<string, number>,
) {
  let score = 0;

  const subjectDayKey =
    `${task.classId}:${task.subjectId}:${candidate.day.id}`;

  const teacherDayKey =
    `${task.teacherId}:${candidate.day.id}`;

  const classDayKey =
    `${task.classId}:${candidate.day.id}`;

  const teacherDayLoad =
    state.teacherDayPeriods.get(teacherDayKey)?.size || 0;

  const classDayLoad =
    state.classDayPeriods.get(classDayKey)?.size || 0;

  score +=
    (state.subjectDayCount.get(subjectDayKey) || 0) *
    12;

  score += teacherDayLoad * 3;
  score += classDayLoad * 2;

  const candidateIndexes = candidate.periods
    .map((period) => periodIndexById.get(period.id))
    .filter(
      (value): value is number =>
        value !== undefined,
    );

  if (candidateIndexes.length) {
    const teacherPeriods =
      state.teacherDayPeriods.get(teacherDayKey) ||
      new Set<number>();

    const classPeriods =
      state.classDayPeriods.get(classDayKey) ||
      new Set<number>();

    const nextTeacherPeriods = new Set([
      ...teacherPeriods,
      ...candidateIndexes,
    ]);

    const nextClassPeriods = new Set([
      ...classPeriods,
      ...candidateIndexes,
    ]);

    score += countGaps(nextTeacherPeriods) * 2;
    score += countGaps(nextClassPeriods) * 4;
  }

  for (const constraint of preferredConstraints) {
    if (
      constraint.type ===
        "TEACHER_UNAVAILABLE_SLOT" &&
      constraint.teacherId === task.teacherId &&
      constraint.dayId === candidate.day.id &&
      candidate.periods.some(
        (period) =>
          period.id === constraint.periodId,
      )
    ) {
      score += 100;
    }

    if (
      constraint.type ===
        "TEACHER_DAY_OFF" &&
      constraint.teacherId === task.teacherId &&
      constraint.dayId === candidate.day.id
    ) {
      score += 100;
    }

    if (
      constraint.type ===
        "TEACHER_NOT_BEFORE_PERIOD" &&
      constraint.teacherId === task.teacherId &&
      constraint.periodId
    ) {
      const limit = periodIndexById.get(
        constraint.periodId,
      );

      if (
        limit !== undefined &&
        candidate.periods.some(
          (period) =>
            (periodIndexById.get(period.id) || 0) <
            limit,
        )
      ) {
        score += 70;
      }
    }

    if (
      constraint.type ===
        "TEACHER_NOT_AFTER_PERIOD" &&
      constraint.teacherId === task.teacherId &&
      constraint.periodId
    ) {
      const limit = periodIndexById.get(
        constraint.periodId,
      );

      if (
        limit !== undefined &&
        candidate.periods.some(
          (period) =>
            (periodIndexById.get(period.id) || 0) >
            limit,
        )
      ) {
        score += 70;
      }
    }

    if (
      constraint.type ===
        "TEACHER_MAX_DAILY_PERIODS" &&
      constraint.teacherId === task.teacherId &&
      constraint.value !== undefined
    ) {
      const key =
        `${task.teacherId}:${candidate.day.id}`;

      const current =
        state.teacherDayPeriods.get(key)?.size || 0;

      if (
        current + candidate.periods.length >
        constraint.value
      ) {
        score += 60;
      }
    }

    if (
      constraint.type ===
        "TEACHER_MAX_CONSECUTIVE_PERIODS" &&
      constraint.teacherId === task.teacherId &&
      constraint.value !== undefined
    ) {
      const key =
        `${task.teacherId}:${candidate.day.id}`;

      const next = new Set(
        state.teacherDayPeriods.get(key) ||
        [],
      );

      for (const period of candidate.periods) {
        const index =
          periodIndexById.get(period.id);

        if (index !== undefined) {
          next.add(index);
        }
      }

      if (
        getMaxConsecutive(next) >
        constraint.value
      ) {
        score += 60;
      }
    }

    if (
      constraint.type ===
        "SUBJECT_FORBIDDEN_SLOT" &&
      constraint.subjectId === task.subjectId &&
      (
        !constraint.dayId ||
        constraint.dayId === candidate.day.id
      ) &&
      candidate.periods.some(
        (period) =>
          period.id === constraint.periodId,
      )
    ) {
      score += 100;
    }

    if (
      constraint.type ===
        "SUBJECT_MAX_DAILY_OCCURRENCES" &&
      constraint.subjectId === task.subjectId &&
      constraint.value !== undefined
    ) {
      const current =
        state.subjectDayCount.get(
          subjectDayKey,
        ) || 0;

      if (
        current + candidate.periods.length >
        constraint.value
      ) {
        score += 50;
      }
    }

    if (
      constraint.type ===
        "CLASS_NO_INTERNAL_GAPS" &&
      (
        !constraint.classId ||
        constraint.classId === task.classId
      )
    ) {
      const key =
        `${task.classId}:${candidate.day.id}`;

      const next = new Set(
        state.classDayPeriods.get(key) || [],
      );

      for (const period of candidate.periods) {
        const index =
          periodIndexById.get(period.id);

        if (index !== undefined) {
          next.add(index);
        }
      }

      score += countGaps(next) * 20;
    }

    if (
      constraint.type ===
        "FAIR_FIRST_PERIODS" &&
      candidate.periods.some(
        (period) => period.id === periods[0]?.id,
      )
    ) {
      score +=
        (state.firstPeriodCount.get(
          task.teacherId,
        ) || 0) *
        (constraint.weight || 10);
    }

    if (
      constraint.type ===
        "FAIR_LAST_PERIODS" &&
      candidate.periods.some(
        (period) =>
          period.id ===
          periods[periods.length - 1]?.id,
      )
    ) {
      score +=
        (state.lastPeriodCount.get(
          task.teacherId,
        ) || 0) *
        (constraint.weight || 10);
    }
  }

  return score;
}

function occupy(
  task: LessonTask,
  candidate: Candidate,
  state: GenerationState,
  hardConstraints: TimetableConstraint[],
  periods: Period[],
  periodIndexById: Map<string, number>,
) {
  for (const period of candidate.periods) {
    const slot =
      `${candidate.day.id}:${period.id}`;

    state.teacherBusy.add(
      `${task.teacherId}:${slot}`,
    );

    state.classBusy.add(
      `${task.classId}:${slot}`,
    );

    const periodIndex =
      periodIndexById.get(period.id);

    if (periodIndex !== undefined) {
      addPeriodIndex(
        state.teacherDayPeriods,
        `${task.teacherId}:${candidate.day.id}`,
        periodIndex,
      );

      addPeriodIndex(
        state.classDayPeriods,
        `${task.classId}:${candidate.day.id}`,
        periodIndex,
      );
    }
  }

  const subjectDayKey =
    `${task.classId}:${task.subjectId}:${candidate.day.id}`;

  state.subjectDayCount.set(
    subjectDayKey,
    (state.subjectDayCount.get(subjectDayKey) || 0) +
      candidate.periods.length,
  );

  for (const constraint of hardConstraints) {
    if (
      constraint.type ===
        "CLASS_MAX_HEAVY_SUBJECTS_DAILY" &&
      (
        !constraint.classId ||
        constraint.classId === task.classId
      ) &&
      constraint.subjectIds?.includes(task.subjectId)
    ) {
      const key =
        `${task.classId}:${candidate.day.id}:${constraint.id}`;

      state.heavySubjectDayCount.set(
        key,
        (state.heavySubjectDayCount.get(key) || 0) +
          1,
      );
    }
  }

  if (
    candidate.periods.some(
      (period) => period.id === periods[0]?.id,
    )
  ) {
    incrementMap(
      state.firstPeriodCount,
      task.teacherId,
    );
  }

  if (
    candidate.periods.some(
      (period) =>
        period.id ===
        periods[periods.length - 1]?.id,
    )
  ) {
    incrementMap(
      state.lastPeriodCount,
      task.teacherId,
    );
  }
}

function release(
  task: LessonTask,
  candidate: Candidate,
  state: GenerationState,
  hardConstraints: TimetableConstraint[],
  periods: Period[],
  periodIndexById: Map<string, number>,
) {
  for (const period of candidate.periods) {
    const slot =
      `${candidate.day.id}:${period.id}`;

    state.teacherBusy.delete(
      `${task.teacherId}:${slot}`,
    );

    state.classBusy.delete(
      `${task.classId}:${slot}`,
    );

    const periodIndex =
      periodIndexById.get(period.id);

    if (periodIndex !== undefined) {
      removePeriodIndex(
        state.teacherDayPeriods,
        `${task.teacherId}:${candidate.day.id}`,
        periodIndex,
      );

      removePeriodIndex(
        state.classDayPeriods,
        `${task.classId}:${candidate.day.id}`,
        periodIndex,
      );
    }
  }

  const subjectDayKey =
    `${task.classId}:${task.subjectId}:${candidate.day.id}`;

  decrementMap(
    state.subjectDayCount,
    subjectDayKey,
    candidate.periods.length,
  );

  for (const constraint of hardConstraints) {
    if (
      constraint.type ===
        "CLASS_MAX_HEAVY_SUBJECTS_DAILY" &&
      (
        !constraint.classId ||
        constraint.classId === task.classId
      ) &&
      constraint.subjectIds?.includes(task.subjectId)
    ) {
      decrementMap(
        state.heavySubjectDayCount,
        `${task.classId}:${candidate.day.id}:${constraint.id}`,
        1,
      );
    }
  }

  if (
    candidate.periods.some(
      (period) => period.id === periods[0]?.id,
    )
  ) {
    decrementMap(
      state.firstPeriodCount,
      task.teacherId,
      1,
    );
  }

  if (
    candidate.periods.some(
      (period) =>
        period.id ===
        periods[periods.length - 1]?.id,
    )
  ) {
    decrementMap(
      state.lastPeriodCount,
      task.teacherId,
      1,
    );
  }
}

export async function saveGeneratedTimetable(
  projectId: string,
  schoolAccountId: string,
  sessions: GeneratedTimetableSession[],
) {
  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id: projectId,
        schoolAccountId,
      },
      select: {
        id: true,
        settingsJson: true,
      },
    });

  if (!project) {
    return null;
  }

  const currentSettings = normalizeRecord(
    project.settingsJson,
  );

  return prisma.timetableProject.update({
    where: {
      id: project.id,
    },
    data: {
      status: "GENERATED",
      settingsJson: {
        ...currentSettings,
        generatedSchedule: sessions,
        generatedAt: new Date().toISOString(),
      },
    },
  });
}

export async function getSavedGeneratedTimetable(
  projectId: string,
  schoolAccountId: string,
) {
  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id: projectId,
        schoolAccountId,
      },
      select: {
        id: true,
        status: true,
        settingsJson: true,
      },
    });

  if (!project) {
    return {
      found: false as const,
      sessions: [] as GeneratedTimetableSession[],
      generatedAt: null as string | null,
      status: null as string | null,
    };
  }

  const settings = normalizeRecord(
    project.settingsJson,
  );

  const sessions = Array.isArray(
    settings.generatedSchedule,
  )
    ? (
        settings.generatedSchedule as
          GeneratedTimetableSession[]
      )
    : [];

  return {
    found: true as const,
    sessions,
    generatedAt:
      typeof settings.generatedAt === "string"
        ? settings.generatedAt
        : null,
    status: project.status,
  };
}

function findConstraint(
  constraints: TimetableConstraint[],
  type: TimetableConstraint["type"],
  field: "teacherId" | "subjectId" | "classId",
  value: string,
) {
  return constraints.find(
    (constraint) =>
      constraint.type === type &&
      constraint[field] === value,
  );
}

function addPeriodIndex(
  map: Map<string, Set<number>>,
  key: string,
  index: number,
) {
  const values = new Set(map.get(key) || []);
  values.add(index);
  map.set(key, values);
}

function removePeriodIndex(
  map: Map<string, Set<number>>,
  key: string,
  index: number,
) {
  const values = new Set(map.get(key) || []);
  values.delete(index);

  if (values.size) {
    map.set(key, values);
  } else {
    map.delete(key);
  }
}

function incrementMap(
  map: Map<string, number>,
  key: string,
) {
  map.set(key, (map.get(key) || 0) + 1);
}

function decrementMap(
  map: Map<string, number>,
  key: string,
  amount: number,
) {
  const next = (map.get(key) || 0) - amount;

  if (next <= 0) {
    map.delete(key);
  } else {
    map.set(key, next);
  }
}

function getMaxConsecutive(values: Set<number>) {
  const sorted = Array.from(values).sort(
    (first, second) => first - second,
  );

  let maximum = 0;
  let current = 0;
  let previous: number | null = null;

  for (const value of sorted) {
    if (
      previous !== null &&
      value === previous + 1
    ) {
      current += 1;
    } else {
      current = 1;
    }

    maximum = Math.max(maximum, current);
    previous = value;
  }

  return maximum;
}

function countGaps(values: Set<number>) {
  if (values.size < 2) {
    return 0;
  }

  const sorted = Array.from(values).sort(
    (first, second) => first - second,
  );

  return (
    sorted[sorted.length - 1] -
    sorted[0] +
    1 -
    sorted.length
  );
}

function getClassIdsFromState(
  state: GenerationState,
) {
  return Array.from(
    new Set(
      Array.from(state.classDayPeriods.keys()).map(
        (key) => key.split(":")[0],
      ),
    ),
  );
}

function arePeriodsConsecutive(
  periods: Period[],
) {
  return periods.every(
    (period, index) =>
      index === 0 ||
      period.order === periods[index - 1].order + 1,
  );
}

function normalizeConstraints(
  value: unknown,
): TimetableConstraint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is TimetableConstraint =>
      Boolean(
        item &&
          typeof item === "object" &&
          "id" in item &&
          "type" in item &&
          "isEnabled" in item,
      ),
  );
}

function normalizeRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeDays(
  value: unknown,
): Day[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record =
      item as Record<string, unknown>;

    const id = String(record.id || "");
    const label = String(record.label || "");

    if (!id || !label) {
      return [];
    }

    return [{
      id,
      label,
      order:
        typeof record.order === "number"
          ? record.order
          : index,
    }];
  });
}

function normalizePeriods(
  value: unknown,
): Period[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record =
      item as Record<string, unknown>;

    const id = String(record.id || "");
    const label = String(record.label || "");

    if (!id || !label) {
      return [];
    }

    return [{
      id,
      label,
      order:
        typeof record.order === "number"
          ? record.order
          : index,
      isBreak: record.isBreak === true,
    }];
  });
}

function normalizeUnavailableSlots(
  value: unknown,
): UnavailableSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record =
      item as Record<string, unknown>;

    const dayId = String(record.dayId || "");
    const periodId = String(
      record.periodId || "",
    );

    if (!dayId || !periodId) {
      return [];
    }

    return [{
      dayId,
      periodId,
    }];
  });
}

function normalizeFixedSlots(
  value: unknown,
): FixedSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record =
      item as Record<string, unknown>;

    const dayId = String(record.dayId || "");
    const periodId = String(
      record.periodId || "",
    );

    if (!dayId || !periodId) {
      return [];
    }

    return [{
      dayId,
      periodId,
      isLocked: record.isLocked === true,
    }];
  });
}