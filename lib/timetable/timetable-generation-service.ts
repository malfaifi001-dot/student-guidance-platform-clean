import "server-only";

import { prisma } from "@/lib/prisma";
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
      errors: blockingErrors.map((issue) => issue.message),
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

  const days = normalizeDays(project.daysJson);
  const periods = normalizePeriods(project.periodsJson)
    .filter((period) => !period.isBreak)
    .sort((first, second) => first.order - second.order);

  const unavailableByTeacher = new Map<string, Set<string>>();

  for (const teacher of project.teachers) {
    const slots = normalizeUnavailableSlots(
      teacher.unavailableSlotsJson,
    );

    unavailableByTeacher.set(
      teacher.id,
      new Set(
        slots.map(
          (slot) => `${slot.dayId}:${slot.periodId}`,
        ),
      ),
    );
  }

  const tasks: LessonTask[] = [];

  for (const assignment of project.assignments) {
    const fixedSlots = normalizeFixedSlots(
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
        fixedSlot: fixedSlots[fixedIndex],
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
        fixedSlot: fixedSlots[fixedIndex],
      });

      fixedIndex += 1;
    }
  }

  tasks.sort((first, second) => {
    if (first.fixedSlot && !second.fixedSlot) return -1;
    if (!first.fixedSlot && second.fixedSlot) return 1;

    if (first.length !== second.length) {
      return second.length - first.length;
    }

    const firstUnavailable =
      unavailableByTeacher.get(first.teacherId)?.size || 0;

    const secondUnavailable =
      unavailableByTeacher.get(second.teacherId)?.size || 0;

    return secondUnavailable - firstUnavailable;
  });

  const teacherBusy = new Set<string>();
  const classBusy = new Set<string>();
  const subjectDayCount = new Map<string, number>();
  const placements = new Map<
    string,
    Array<{
      day: Day;
      periods: Period[];
    }>
  >();

  const deadline = Date.now() + 8000;

  function placeTask(index: number): boolean {
    if (index >= tasks.length) {
      return true;
    }

    if (Date.now() > deadline) {
      return false;
    }

    const task = tasks[index];

    const candidates = createCandidates(
      task,
      days,
      periods,
    ).sort((first, second) => {
      const firstSubjectCount =
        subjectDayCount.get(
          `${task.classId}:${task.subjectId}:${first.day.id}`,
        ) || 0;

      const secondSubjectCount =
        subjectDayCount.get(
          `${task.classId}:${task.subjectId}:${second.day.id}`,
        ) || 0;

      return firstSubjectCount - secondSubjectCount;
    });

    for (const candidate of candidates) {
      if (
        !canPlace(
          task,
          candidate.day,
          candidate.periods,
          unavailableByTeacher,
          teacherBusy,
          classBusy,
        )
      ) {
        continue;
      }

      occupy(
        task,
        candidate.day,
        candidate.periods,
        teacherBusy,
        classBusy,
        subjectDayCount,
      );

      placements.set(task.id, [candidate]);

      if (placeTask(index + 1)) {
        return true;
      }

      placements.delete(task.id);

      release(
        task,
        candidate.day,
        candidate.periods,
        teacherBusy,
        classBusy,
        subjectDayCount,
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
        "تعذر إنشاء جدول كامل. راجع قيود المعلمين أو توزيع الحصص.",
      ],
      sessions: [] as GeneratedTimetableSession[],
    };
  }

  const sessions: GeneratedTimetableSession[] = [];

  for (const task of tasks) {
    const taskPlacements = placements.get(task.id) || [];

    for (const placement of taskPlacements) {
      placement.periods.forEach((period, blockIndex) => {
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
        });
      });
    }
  }

  sessions.sort((first, second) => {
    const firstDay =
      days.findIndex((day) => day.id === first.dayId);

    const secondDay =
      days.findIndex((day) => day.id === second.dayId);

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

function createCandidates(
  task: LessonTask,
  days: Day[],
  periods: Period[],
) {
  if (task.fixedSlot) {
    const day = days.find(
      (item) => item.id === task.fixedSlot?.dayId,
    );

    const periodIndex = periods.findIndex(
      (item) => item.id === task.fixedSlot?.periodId,
    );

    if (!day || periodIndex < 0) {
      return [];
    }

    const selectedPeriods =
      task.length === 2
        ? periods.slice(periodIndex, periodIndex + 2)
        : periods.slice(periodIndex, periodIndex + 1);

    if (selectedPeriods.length !== task.length) {
      return [];
    }

    return [
      {
        day,
        periods: selectedPeriods,
      },
    ];
  }

  const candidates: Array<{
    day: Day;
    periods: Period[];
  }> = [];

  for (const day of days) {
    for (
      let periodIndex = 0;
      periodIndex < periods.length;
      periodIndex += 1
    ) {
      const selectedPeriods =
        task.length === 2
          ? periods.slice(periodIndex, periodIndex + 2)
          : periods.slice(periodIndex, periodIndex + 1);

      if (selectedPeriods.length !== task.length) {
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
  day: Day,
  periods: Period[],
  unavailableByTeacher: Map<string, Set<string>>,
  teacherBusy: Set<string>,
  classBusy: Set<string>,
) {
  const unavailable =
    unavailableByTeacher.get(task.teacherId) ||
    new Set<string>();

  for (const period of periods) {
    const slot = `${day.id}:${period.id}`;

    if (unavailable.has(slot)) {
      return false;
    }

    if (
      teacherBusy.has(`${task.teacherId}:${slot}`) ||
      classBusy.has(`${task.classId}:${slot}`)
    ) {
      return false;
    }
  }

  return true;
}

function occupy(
  task: LessonTask,
  day: Day,
  periods: Period[],
  teacherBusy: Set<string>,
  classBusy: Set<string>,
  subjectDayCount: Map<string, number>,
) {
  for (const period of periods) {
    const slot = `${day.id}:${period.id}`;

    teacherBusy.add(`${task.teacherId}:${slot}`);
    classBusy.add(`${task.classId}:${slot}`);
  }

  const subjectDayKey =
    `${task.classId}:${task.subjectId}:${day.id}`;

  subjectDayCount.set(
    subjectDayKey,
    (subjectDayCount.get(subjectDayKey) || 0) + 1,
  );
}

function release(
  task: LessonTask,
  day: Day,
  periods: Period[],
  teacherBusy: Set<string>,
  classBusy: Set<string>,
  subjectDayCount: Map<string, number>,
) {
  for (const period of periods) {
    const slot = `${day.id}:${period.id}`;

    teacherBusy.delete(`${task.teacherId}:${slot}`);
    classBusy.delete(`${task.classId}:${slot}`);
  }

  const subjectDayKey =
    `${task.classId}:${task.subjectId}:${day.id}`;

  const nextCount =
    (subjectDayCount.get(subjectDayKey) || 1) - 1;

  if (nextCount <= 0) {
    subjectDayCount.delete(subjectDayKey);
  } else {
    subjectDayCount.set(subjectDayKey, nextCount);
  }
}

function normalizeDays(value: unknown): Day[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const valueItem = item as Record<string, unknown>;
    const id = String(valueItem.id || "");
    const label = String(valueItem.label || "");

    if (!id || !label) {
      return [];
    }

    return [{
      id,
      label,
      order:
        typeof valueItem.order === "number"
          ? valueItem.order
          : index,
    }];
  });
}

function normalizePeriods(value: unknown): Period[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const valueItem = item as Record<string, unknown>;
    const id = String(valueItem.id || "");
    const label = String(valueItem.label || "");

    if (!id || !label) {
      return [];
    }

    return [{
      id,
      label,
      order:
        typeof valueItem.order === "number"
          ? valueItem.order
          : index,
      isBreak: valueItem.isBreak === true,
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

    const valueItem = item as Record<string, unknown>;
    const dayId = String(valueItem.dayId || "");
    const periodId = String(valueItem.periodId || "");

    if (!dayId || !periodId) {
      return [];
    }

    return [{ dayId, periodId }];
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

    const valueItem = item as Record<string, unknown>;
    const dayId = String(valueItem.dayId || "");
    const periodId = String(valueItem.periodId || "");

    if (!dayId || !periodId) {
      return [];
    }

    return [{
      dayId,
      periodId,
      isLocked: valueItem.isLocked === true,
    }];
  });
}
export async function saveGeneratedTimetable(
  projectId: string,
  schoolAccountId: string,
  sessions: GeneratedTimetableSession[],
) {
  const project = await prisma.timetableProject.findFirst({
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

  const currentSettings =
    project.settingsJson &&
    typeof project.settingsJson === "object" &&
    !Array.isArray(project.settingsJson)
      ? project.settingsJson
      : {};

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
  const project = await prisma.timetableProject.findFirst({
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

  const settings =
    project.settingsJson &&
    typeof project.settingsJson === "object" &&
    !Array.isArray(project.settingsJson)
      ? (project.settingsJson as Record<string, unknown>)
      : {};

  const sessions = Array.isArray(
    settings.generatedSchedule,
  )
    ? (settings.generatedSchedule as GeneratedTimetableSession[])
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