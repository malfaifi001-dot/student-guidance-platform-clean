import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  TimetableValidationIssue,
} from "@/lib/timetable/timetable-types";

type DayValue = {
  id?: unknown;
};

type PeriodValue = {
  id?: unknown;
  isBreak?: unknown;
};

type UnavailableSlot = {
  dayId?: unknown;
  periodId?: unknown;
};

export async function validateTimetableProject(
  projectId: string,
  schoolAccountId: string,
) {
  const project = await prisma.timetableProject.findFirst({
    where: {
      id: projectId,
      schoolAccountId,
    },
    include: {
      teachers: true,
      classes: true,
      subjects: true,
      classSubjects: {
        include: {
          class: true,
          subject: true,
        },
      },
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
      issues: [] as TimetableValidationIssue[],
      summary: null,
    };
  }

  const issues: TimetableValidationIssue[] = [];

  const days = Array.isArray(project.daysJson)
    ? (project.daysJson as DayValue[])
    : [];

  const periods = Array.isArray(project.periodsJson)
    ? (project.periodsJson as PeriodValue[])
    : [];

  const teachingPeriods = periods.filter(
    (period) => period.isBreak !== true,
  );

  const weeklyCapacity =
    days.length * teachingPeriods.length;

  if (!days.length) {
    issues.push({
      level: "ERROR",
      code: "PROJECT_DAYS_REQUIRED",
      message: "يجب تحديد يوم دراسي واحد على الأقل.",
      entityId: project.id,
    });
  }

  if (!teachingPeriods.length) {
    issues.push({
      level: "ERROR",
      code: "PROJECT_PERIODS_REQUIRED",
      message: "يجب تحديد حصة دراسية واحدة على الأقل.",
      entityId: project.id,
    });
  }

  if (!project.teachers.some((teacher) => teacher.isActive)) {
    issues.push({
      level: "ERROR",
      code: "TEACHER_REQUIRED",
      message: "أضف معلمًا واحدًا على الأقل.",
      entityId: project.id,
    });
  }

  if (!project.classes.some((classItem) => classItem.isActive)) {
    issues.push({
      level: "ERROR",
      code: "CLASS_REQUIRED",
      message: "أضف فصلًا واحدًا على الأقل.",
      entityId: project.id,
    });
  }

  if (!project.subjects.some((subject) => subject.isActive)) {
    issues.push({
      level: "ERROR",
      code: "SUBJECT_REQUIRED",
      message: "أضف مادة واحدة على الأقل.",
      entityId: project.id,
    });
  }

  for (const classSubject of project.classSubjects) {
    const assignedLessons = project.assignments
      .filter(
        (assignment) =>
          assignment.classId === classSubject.classId &&
          assignment.subjectId === classSubject.subjectId,
      )
      .reduce(
        (total, assignment) =>
          total + assignment.assignedLessons,
        0,
      );

    if (assignedLessons < classSubject.weeklyLessons) {
      issues.push({
        level: "ERROR",
        code: "UNASSIGNED_SUBJECT",
        message:
          `مادة ${classSubject.subject.name} للفصل ` +
          `${classSubject.class.name} غير مكتملة الإسناد: ` +
          `${assignedLessons} من ${classSubject.weeklyLessons} حصص.`,
        entityId: classSubject.id,
      });
    }

    if (assignedLessons > classSubject.weeklyLessons) {
      issues.push({
        level: "ERROR",
        code: "ASSIGNMENT_PERIODS_INVALID",
        message:
          `إسناد مادة ${classSubject.subject.name} للفصل ` +
          `${classSubject.class.name} أكبر من عدد حصصها الأسبوعية.`,
        entityId: classSubject.id,
      });
    }
  }

  for (const teacher of project.teachers) {
    if (!teacher.isActive) {
      continue;
    }

    const assignedLessons = project.assignments
      .filter(
        (assignment) =>
          assignment.teacherId === teacher.id,
      )
      .reduce(
        (total, assignment) =>
          total + assignment.assignedLessons,
        0,
      );

    if (assignedLessons > teacher.maxWeeklyLoad) {
      issues.push({
        level: "ERROR",
        code: "TEACHER_QUOTA_EXCEEDED",
        message:
          `المعلم ${teacher.name} تجاوز نصابه بـ ` +
          `${assignedLessons - teacher.maxWeeklyLoad} حصة.`,
        entityId: teacher.id,
      });
    }

    const unavailableSlots = normalizeUnavailableSlots(
      teacher.unavailableSlotsJson,
    );

    const availableSlots =
      weeklyCapacity - unavailableSlots.length;

    if (assignedLessons > availableSlots) {
      issues.push({
        level: "ERROR",
        code: "TEACHER_CONSTRAINT_UNSOLVABLE",
        message:
          `قيود المعلم ${teacher.name} لا تسمح بتوزيع ` +
          `${assignedLessons} حصة ضمن الأوقات المتاحة.`,
        entityId: teacher.id,
      });
    }
  }

  for (const classItem of project.classes) {
    if (!classItem.isActive) {
      continue;
    }

    const requiredLessons = project.classSubjects
      .filter(
        (classSubject) =>
          classSubject.classId === classItem.id,
      )
      .reduce(
        (total, classSubject) =>
          total + classSubject.weeklyLessons,
        0,
      );

    if (requiredLessons > weeklyCapacity) {
      issues.push({
        level: "ERROR",
        code: "CLASS_CAPACITY_OVERFLOW",
        message:
          `إجمالي حصص الفصل ${classItem.name} هو ` +
          `${requiredLessons} بينما السعة الأسبوعية ` +
          `${weeklyCapacity} حصة.`,
        entityId: classItem.id,
      });
    }

    if (
      weeklyCapacity > 0 &&
      requiredLessons < weeklyCapacity
    ) {
      issues.push({
        level: "WARNING",
        code: "CLASS_CAPACITY_UNDERFLOW",
        message:
          `الفصل ${classItem.name} لديه ` +
          `${weeklyCapacity - requiredLessons} خانات فارغة أسبوعيًا.`,
        entityId: classItem.id,
      });
    }
  }

  for (const assignment of project.assignments) {
    const calculatedLessons =
      assignment.singlePeriods +
      assignment.doublePeriods * 2;

    if (
      calculatedLessons !== assignment.assignedLessons
    ) {
      issues.push({
        level: "ERROR",
        code: "ASSIGNMENT_PERIODS_INVALID",
        message:
          `توزيع ${assignment.subject.name} للفصل ` +
          `${assignment.class.name} مع المعلم ` +
          `${assignment.teacher.name} غير صحيح.`,
        entityId: assignment.id,
      });
    }

    if (
      assignment.doublePeriods > 0 &&
      teachingPeriods.length < 2
    ) {
      issues.push({
        level: "ERROR",
        code: "ASSIGNMENT_PERIODS_INVALID",
        message:
          `لا يمكن إنشاء حصة مزدوجة لمادة ` +
          `${assignment.subject.name} لأن اليوم يحتوي على أقل من حصتين.`,
        entityId: assignment.id,
      });
    }
  }

  const errors = issues.filter(
    (issue) => issue.level === "ERROR",
  );

  const warnings = issues.filter(
    (issue) => issue.level === "WARNING",
  );

  return {
    found: true as const,
    issues,
    summary: {
      ready: errors.length === 0,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      teachersCount: project.teachers.filter(
        (teacher) => teacher.isActive,
      ).length,
      classesCount: project.classes.filter(
        (classItem) => classItem.isActive,
      ).length,
      subjectsCount: project.subjects.filter(
        (subject) => subject.isActive,
      ).length,
      assignmentsCount: project.assignments.length,
      weeklyCapacity,
    },
  };
}

function normalizeUnavailableSlots(
  value: unknown,
): Array<{
  dayId: string;
  periodId: string;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Map<
    string,
    {
      dayId: string;
      periodId: string;
    }
  >();

  for (const item of value) {
    const slot = item as UnavailableSlot;

    const dayId =
      typeof slot?.dayId === "string"
        ? slot.dayId
        : "";

    const periodId =
      typeof slot?.periodId === "string"
        ? slot.periodId
        : "";

    if (!dayId || !periodId) {
      continue;
    }

    unique.set(
      `${dayId}:${periodId}`,
      {
        dayId,
        periodId,
      },
    );
  }

  return Array.from(unique.values());
}