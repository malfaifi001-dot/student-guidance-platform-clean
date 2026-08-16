import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  resolveTimetableStageIdForClass,
  resolveTimetableStageWeeklyPeriodTarget,
} from "@/lib/timetable-v2/project-setup";

export type TimetableV2ReadinessSeverity =
  | "ERROR"
  | "WARNING"
  | "INFO";

export type TimetableV2ReadinessCategory =
  | "PROJECT"
  | "ASSIGNMENTS"
  | "TEACHERS"
  | "CLASSES"
  | "SUBJECTS"
  | "CONSTRAINTS"
  | "TIME";

export type TimetableV2ReadinessIssue = {
  id: string;

  severity:
    TimetableV2ReadinessSeverity;

  category:
    TimetableV2ReadinessCategory;

  code: string;

  title: string;

  description: string;

  actionLabel?: string;

  href?: string;

  entityName?: string;

  meta?: Record<
    string,
    string | number | boolean | null
  >;
};

type DayItem = {
  id: string;
  label: string;
  order: number;
};

type PeriodItem = {
  id: string;
  label: string;
  order: number;
  isBreak: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

function asDays(
  value: unknown,
): DayItem[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value.filter(
    (item): item is DayItem =>
      Boolean(
        item &&
          typeof item ===
            "object" &&
          "id" in item &&
          "label" in item,
      ),
  );
}

function asPeriods(
  value: unknown,
): PeriodItem[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value.filter(
    (item): item is PeriodItem =>
      Boolean(
        item &&
          typeof item ===
            "object" &&
          "id" in item &&
          "label" in item,
      ),
  );
}

function uniqueSlotCount(
  slots: Array<{
    dayId: string;
    periodId: string;
  }>,
) {
  return new Set(
    slots.map(
      (slot) =>
        `${slot.dayId}:${slot.periodId}`,
    ),
  ).size;
}

function intersects(
  left: string[],
  right: string[],
) {
  if (
    left.length === 0 ||
    right.length === 0
  ) {
    return false;
  }

  const rightSet =
    new Set(right);

  return left.some(
    (value) =>
      rightSet.has(value),
  );
}

function slotKeys(
  constraint: {
    slots: Array<{
      dayId: string;
      periodId: string;
    }>;

    days: Array<{
      dayId: string;
    }>;

    periods: Array<{
      periodId: string;
    }>;
  },
) {
  const keys =
    new Set<string>();

  for (
    const slot of
    constraint.slots
  ) {
    keys.add(
      `${slot.dayId}:${slot.periodId}`,
    );
  }

  if (
    constraint.days.length >
      0 &&
    constraint.periods.length >
      0
  ) {
    for (
      const day of
      constraint.days
    ) {
      for (
        const period of
        constraint.periods
      ) {
        keys.add(
          `${day.dayId}:${period.periodId}`,
        );
      }
    }
  }

  return keys;
}

function constraintTargets(
  constraint: {
    teachers: Array<{
      teacherId: string;
    }>;

    subjects: Array<{
      subjectId: string;
    }>;

    classes: Array<{
      classId: string;
    }>;
  },
) {
  return {
    teacherIds:
      constraint.teachers.map(
        (item) =>
          item.teacherId,
      ),

    subjectIds:
      constraint.subjects.map(
        (item) =>
          item.subjectId,
      ),

    classIds:
      constraint.classes.map(
        (item) =>
          item.classId,
      ),
  };
}

function constraintsShareSlot(
  first: ReturnType<
    typeof slotKeys
  >,
  second: ReturnType<
    typeof slotKeys
  >,
) {
  for (
    const key of first
  ) {
    if (
      second.has(key)
    ) {
      return true;
    }
  }

  return false;
}

export async function analyzeTimetableV2Readiness(
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
        name: true,
        academicYear: true,
        semester: true,
        status: true,
        daysJson: true,
        periodsJson: true,
        settingsJson: true,
      },
    });

  if (!project) {
    throw new Error(
      "PROJECT_NOT_FOUND",
    );
  }

  const [
    teachers,
    classes,
    subjects,
    classSubjects,
    assignments,
    constraints,
  ] = await Promise.all([
    prisma.timetableTeacher.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        specialty: true,
        maxWeeklyLoad: true,
        isActive: true,
      },
    }),

    prisma.timetableClass.findMany({
      where: {
        projectId,
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),

    prisma.timetableSubject.findMany({
      where: {
        projectId,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),

    prisma.timetableClassSubject.findMany({
      where: {
        projectId,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },

        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),

    prisma.timetableAssignment.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        teacherId: true,
        classId: true,
        subjectId: true,
        assignedLessons: true,
      },
    }),

    prisma.timetableConstraint.findMany({
      where: {
        projectId,
        isActive: true,
      },
      include: {
        teachers: true,
        subjects: true,
        classes: true,
        days: true,
        periods: true,
        slots: true,
      },
    }),
  ]);

  const issues:
    TimetableV2ReadinessIssue[] =
      [];

  const days =
    asDays(
      project.daysJson,
    );

  const periods =
    asPeriods(
      project.periodsJson,
    );

  const teachingPeriods =
    periods.filter(
      (period) =>
        !period.isBreak,
    );

  const breaks =
    periods.filter(
      (period) =>
        period.isBreak,
    );

  const weeklySlotCount =
    days.length *
    teachingPeriods.length;

  // =========================================================
  // Project / time structure
  // =========================================================

  if (
    days.length === 0
  ) {
    issues.push({
      id:
        "project-no-days",

      severity:
        "ERROR",

      category:
        "TIME",

      code:
        "NO_STUDY_DAYS",

      title:
        "لا توجد أيام دراسية",

      description:
        "يجب تحديد أيام الدراسة قبل إنشاء الجدول.",

      actionLabel:
        "فتح القيود والأوقات",

      href:
        `/dashboard/timetable-v2/${projectId}/constraints`,
    });
  }

  if (
    teachingPeriods.length ===
    0
  ) {
    issues.push({
      id:
        "project-no-periods",

      severity:
        "ERROR",

      category:
        "TIME",

      code:
        "NO_TEACHING_PERIODS",

      title:
        "لا توجد حصص دراسية",

      description:
        "يجب أن يحتوي اليوم الدراسي على حصة واحدة على الأقل.",

      actionLabel:
        "ضبط أوقات اليوم",

      href:
        `/dashboard/timetable-v2/${projectId}/constraints`,
    });
  }

  for (
    const period of periods
  ) {
    if (
      !period.startTime ||
      !period.endTime
    ) {
      issues.push({
        id:
          `period-time-${period.id}`,

        severity:
          "WARNING",

        category:
          "TIME",

        code:
          "PERIOD_TIME_MISSING",

        title:
          `وقت ${period.label} غير مكتمل`,

        description:
          "يفضل تحديد وقت البداية والنهاية لتصبح مراجعة الجدول والطباعة أوضح.",

        actionLabel:
          "تعديل الأوقات",

        href:
          `/dashboard/timetable-v2/${projectId}/constraints`,

        entityName:
          period.label,
      });
    }
  }

  // =========================================================
  // Base entities
  // =========================================================

  const activeTeachers =
    teachers.filter(
      (teacher) =>
        teacher.isActive,
    );

  if (
    activeTeachers.length ===
    0
  ) {
    issues.push({
      id:
        "no-active-teachers",

      severity:
        "ERROR",

      category:
        "TEACHERS",

      code:
        "NO_ACTIVE_TEACHERS",

      title:
        "لا يوجد معلمون نشطون",

      description:
        "لا يمكن إنشاء جدول دون معلمين نشطين.",

      actionLabel:
        "إدارة المعلمين",

      href:
        `/dashboard/timetable-v2/${projectId}/teachers`,
    });
  }

  if (
    classes.length === 0
  ) {
    issues.push({
      id:
        "no-classes",

      severity:
        "ERROR",

      category:
        "CLASSES",

      code:
        "NO_CLASSES",

      title:
        "لا توجد فصول",

      description:
        "المشروع لا يحتوي على فصول نشطة.",

      actionLabel:
        "العودة للمشروع",

      href:
        `/dashboard/timetable-v2/${projectId}`,
    });
  }

  if (
    subjects.length === 0
  ) {
    issues.push({
      id:
        "no-subjects",

      severity:
        "ERROR",

      category:
        "SUBJECTS",

      code:
        "NO_SUBJECTS",

      title:
        "لا توجد مواد",

      description:
        "المشروع لا يحتوي على مواد دراسية نشطة.",

      actionLabel:
        "العودة للمشروع",

      href:
        `/dashboard/timetable-v2/${projectId}`,
    });
  }

  // =========================================================
  // Assignment completeness + shared assignments
  // =========================================================

  const requiredLessons =
    classSubjects.reduce(
      (sum, row) =>
        sum +
        row.weeklyLessons,
      0,
    );

  const requiredByClass = new Map<string, number>();
  for (const row of classSubjects) {
    requiredByClass.set(
      row.classId,
      (requiredByClass.get(row.classId) ?? 0) + row.weeklyLessons,
    );
  }

  for (const classItem of classes) {
    const stageId = resolveTimetableStageIdForClass(
      project.settingsJson,
      classItem.id,
      classItem.name,
    );
    if (!stageId) {
      continue;
    }

    const target = resolveTimetableStageWeeklyPeriodTarget({
      settingsJson: project.settingsJson,
      stageId,
    });
    if (target == null) {
      continue;
    }

    const required = requiredByClass.get(classItem.id) ?? 0;
    if (required > target) {
      issues.push({
        id: `class-weekly-target-${classItem.id}`,
        severity: "ERROR",
        category: "ASSIGNMENTS",
        code: "CLASS_WEEKLY_TARGET_EXCEEDED",
        title: `الهدف الأسبوعي للفصل ${classItem.name} متجاوز`,
        description: `المطلوب ${required} حصة، بينما الهدف المحدد للمرحلة هو ${target} حصة.`,
        actionLabel: "مراجعة الإسنادات",
        href: `/dashboard/timetable-v2/${projectId}/assignments`,
        entityName: classItem.name,
        meta: {
          required,
          target,
        },
      });
    }
  }

  const assignmentTotalByKey =
    new Map<
      string,
      number
    >();

  for (
    const assignment of
    assignments
  ) {
    const key =
      `${assignment.classId}:${assignment.subjectId}`;

    assignmentTotalByKey.set(
      key,
      (
        assignmentTotalByKey.get(
          key,
        ) ?? 0
      ) +
        assignment.assignedLessons,
    );
  }

  let fullyAssignedRows = 0;
  let underAssignedRows = 0;
  let overAssignedRows = 0;
  let assignedLessons = 0;

  for (
    const row of
    classSubjects
  ) {
    const key =
      `${row.classId}:${row.subjectId}`;

    const assigned =
      assignmentTotalByKey.get(
        key,
      ) ?? 0;

    assignedLessons +=
      assigned;

    if (
      assigned ===
      row.weeklyLessons
    ) {
      fullyAssignedRows += 1;

      continue;
    }

    if (
      assigned <
      row.weeklyLessons
    ) {
      underAssignedRows += 1;

      const missing =
        row.weeklyLessons -
        assigned;

      issues.push({
        id:
          `assignment-under-${row.id}`,

        severity:
          "ERROR",

        category:
          "ASSIGNMENTS",

        code:
          "ASSIGNMENT_INCOMPLETE",

        title:
          `${row.subject.name} في ${row.class.name} غير مكتملة الإسناد`,

        description:
          `المطلوب ${row.weeklyLessons} حصص، والمسند ${assigned}، والمتبقي ${missing}.`,

        actionLabel:
          "فتح شبكة الإسناد",

        href:
          `/dashboard/timetable-v2/${projectId}/assignments`,

        entityName:
          `${row.class.name} — ${row.subject.name}`,

        meta: {
          required:
            row.weeklyLessons,

          assigned,

          missing,
        },
      });

      continue;
    }

    overAssignedRows += 1;

    issues.push({
      id:
        `assignment-over-${row.id}`,

      severity:
        "ERROR",

      category:
        "ASSIGNMENTS",

      code:
        "ASSIGNMENT_OVERFLOW",

      title:
        `${row.subject.name} في ${row.class.name} تجاوزت الخطة`,

      description:
        `المطلوب ${row.weeklyLessons} حصص لكن مجموع الإسنادات ${assigned}.`,

      actionLabel:
        "مراجعة الإسناد",

      href:
        `/dashboard/timetable-v2/${projectId}/assignments`,

      entityName:
        `${row.class.name} — ${row.subject.name}`,
    });
  }

  // =========================================================
  // Teacher weekly load
  // =========================================================

  const teacherLoad =
    new Map<
      string,
      number
    >();

  for (
    const teacher of
    teachers
  ) {
    teacherLoad.set(
      teacher.id,
      0,
    );
  }

  for (
    const assignment of
    assignments
  ) {
    teacherLoad.set(
      assignment.teacherId,
      (
        teacherLoad.get(
          assignment.teacherId,
        ) ?? 0
      ) +
        assignment.assignedLessons,
    );
  }

  let overloadedTeachers = 0;
  let teachersWithoutSpecialty = 0;

  for (
    const teacher of
    activeTeachers
  ) {
    const load =
      teacherLoad.get(
        teacher.id,
      ) ?? 0;

    if (
      load >
      teacher.maxWeeklyLoad
    ) {
      overloadedTeachers += 1;

      issues.push({
        id:
          `teacher-overload-${teacher.id}`,

        severity:
          "ERROR",

        category:
          "TEACHERS",

        code:
          "TEACHER_WEEKLY_OVERLOAD",

        title:
          `${teacher.name} متجاوز للنصاب الأسبوعي`,

        description:
          `الحمل الحالي ${load} من حد أقصى ${teacher.maxWeeklyLoad} حصة.`,

        actionLabel:
          "مراجعة الإسناد",

        href:
          `/dashboard/timetable-v2/${projectId}/assignments?teacherId=${teacher.id}`,

        entityName:
          teacher.name,

        meta: {
          load,

          maxWeeklyLoad:
            teacher.maxWeeklyLoad,

          overflow:
            load -
            teacher.maxWeeklyLoad,
        },
      });
    }

    if (
      !teacher.specialty?.trim()
    ) {
      teachersWithoutSpecialty +=
        1;
    }
  }

  if (
    teachersWithoutSpecialty >
    0
  ) {
    issues.push({
      id:
        "teachers-without-specialty",

      severity:
        "INFO",

      category:
        "TEACHERS",

      code:
        "TEACHER_SPECIALTY_MISSING",

      title:
        `${teachersWithoutSpecialty} معلمين بدون تخصص`,

      description:
        "إضافة التخصص تساعد الاقتراحات التلقائية وتحليل جودة الإسناد، لكنها لا تمنع إنشاء الجدول.",

      actionLabel:
        "إدارة المعلمين",

      href:
        `/dashboard/timetable-v2/${projectId}/teachers`,
    });
  }

  // =========================================================
  // Teacher available slot capacity
  // =========================================================

  for (
    const teacher of
    activeTeachers
  ) {
    const load =
      teacherLoad.get(
        teacher.id,
      ) ?? 0;

    const blockedSlots =
      new Set<string>();

    for (
      const constraint of
      constraints
    ) {
      if (
        ![
          "TEACHER_UNAVAILABLE",
          "TEACHER_DAY_OFF",
        ].includes(
          constraint.type,
        )
      ) {
        continue;
      }

      const teacherIds =
        constraint.teachers.map(
          (item) =>
            item.teacherId,
        );

      if (
        !teacherIds.includes(
          teacher.id,
        )
      ) {
        continue;
      }

      for (
        const key of
        slotKeys(
          constraint,
        )
      ) {
        blockedSlots.add(
          key,
        );
      }

      if (
        constraint.type ===
          "TEACHER_DAY_OFF" &&
        constraint.days.length >
          0
      ) {
        for (
          const day of
          constraint.days
        ) {
          for (
            const period of
            teachingPeriods
          ) {
            blockedSlots.add(
              `${day.dayId}:${period.id}`,
            );
          }
        }
      }
    }

    const availableSlots =
      Math.max(
        0,
        weeklySlotCount -
          blockedSlots.size,
      );

    if (
      load >
      availableSlots
    ) {
      issues.push({
        id:
          `teacher-capacity-${teacher.id}`,

        severity:
          "ERROR",

        category:
          "CONSTRAINTS",

        code:
          "TEACHER_INSUFFICIENT_TIME_CAPACITY",

        title:
          `الخانات المتاحة للمعلم ${teacher.name} غير كافية`,

        description:
          `لديه ${load} حصة مسندة، بينما القيود تترك له ${availableSlots} خانة زمنية فقط.`,

        actionLabel:
          "مراجعة قيود المعلم",

        href:
          `/dashboard/timetable-v2/${projectId}/constraints`,

        entityName:
          teacher.name,

        meta: {
          assignedLessons:
            load,

          availableSlots,
        },
      });
    } else if (
      load > 0 &&
      availableSlots -
        load <=
        2
    ) {
      issues.push({
        id:
          `teacher-tight-${teacher.id}`,

        severity:
          "WARNING",

        category:
          "CONSTRAINTS",

        code:
          "TEACHER_TIGHT_AVAILABILITY",

        title:
          `مرونة ${teacher.name} الزمنية منخفضة`,

        description:
          `بعد القيود لديه ${availableSlots} خانة متاحة مقابل ${load} حصة مسندة. هامش الحركة صغير.`,

        actionLabel:
          "مراجعة القيود",

        href:
          `/dashboard/timetable-v2/${projectId}/constraints`,

        entityName:
          teacher.name,
      });
    }
  }

  // =========================================================
  // Class weekly capacity
  // =========================================================

  for (
    const classItem of
    classes
  ) {
    const required =
      classSubjects
        .filter(
          (row) =>
            row.classId ===
            classItem.id,
        )
        .reduce(
          (sum, row) =>
            sum +
            row.weeklyLessons,
          0,
        );

    const blocked =
      new Set<string>();

    for (
      const constraint of
      constraints
    ) {
      if (
        ![
          "CLASS_BLOCKED_SLOT",
          "CLASS_BLOCKED_DAY",
          "CLASS_BLOCKED_PERIOD",
        ].includes(
          constraint.type,
        )
      ) {
        continue;
      }

      const classIds =
        constraint.classes.map(
          (item) =>
            item.classId,
        );

      if (
        !classIds.includes(
          classItem.id,
        )
      ) {
        continue;
      }

      for (
        const key of
        slotKeys(
          constraint,
        )
      ) {
        blocked.add(
          key,
        );
      }

      if (
        constraint.type ===
          "CLASS_BLOCKED_DAY"
      ) {
        for (
          const day of
          constraint.days
        ) {
          for (
            const period of
            teachingPeriods
          ) {
            blocked.add(
              `${day.dayId}:${period.id}`,
            );
          }
        }
      }

      if (
        constraint.type ===
          "CLASS_BLOCKED_PERIOD"
      ) {
        for (
          const day of
          days
        ) {
          for (
            const periodLink of
            constraint.periods
          ) {
            blocked.add(
              `${day.id}:${periodLink.periodId}`,
            );
          }
        }
      }
    }

    const available =
      Math.max(
        0,
        weeklySlotCount -
          blocked.size,
      );

    if (
      required >
      available
    ) {
      issues.push({
        id:
          `class-capacity-${classItem.id}`,

        severity:
          "ERROR",

        category:
          "CLASSES",

        code:
          "CLASS_CAPACITY_INSUFFICIENT",

        title:
          `الفصل ${classItem.name} لا يملك خانات كافية`,

        description:
          `الخطة تحتاج ${required} حصة أسبوعية، لكن القيود تترك ${available} خانة فقط.`,

        actionLabel:
          "مراجعة قيود الفصل",

        href:
          `/dashboard/timetable-v2/${projectId}/constraints`,

        entityName:
          classItem.name,
      });
    }
  }

  // =========================================================
  // Hard conflict detection around fixed assignments
  // =========================================================

  const fixedConstraints =
    constraints.filter(
      (constraint) =>
        [
          "FIXED_ASSIGNMENT",
          "SUBJECT_FIXED_SLOT",
        ].includes(
          constraint.type,
        ),
    );

  const blockingConstraints =
    constraints.filter(
      (constraint) =>
        [
          "TEACHER_UNAVAILABLE",
          "TEACHER_DAY_OFF",
          "SUBJECT_BLOCKED",
          "SUBJECT_BLOCKED_DAYS",
          "CLASS_BLOCKED_SLOT",
          "CLASS_BLOCKED_DAY",
          "CLASS_BLOCKED_PERIOD",
          "SCHOOL_BLOCKED_SLOT",
          "SCHOOL_NO_TEACHING_SLOT",
          "ASSIGNMENT_BLOCKED_SLOT",
        ].includes(
          constraint.type,
        ),
    );

  let hardConflictCount = 0;

  for (
    const fixed of
    fixedConstraints
  ) {
    const fixedTargets =
      constraintTargets(
        fixed,
      );

    const fixedSlots =
      slotKeys(
        fixed,
      );

    for (
      const blocked of
      blockingConstraints
    ) {
      const blockedTargets =
        constraintTargets(
          blocked,
        );

      const blockedSlots =
        slotKeys(
          blocked,
        );

      if (
        !constraintsShareSlot(
          fixedSlots,
          blockedSlots,
        )
      ) {
        continue;
      }

      let targetConflict =
        false;

      if (
        [
          "SCHOOL_BLOCKED_SLOT",
          "SCHOOL_NO_TEACHING_SLOT",
        ].includes(
          blocked.type,
        )
      ) {
        targetConflict =
          true;
      }

      if (
        intersects(
          fixedTargets.teacherIds,
          blockedTargets.teacherIds,
        )
      ) {
        targetConflict =
          true;
      }

      if (
        intersects(
          fixedTargets.subjectIds,
          blockedTargets.subjectIds,
        )
      ) {
        targetConflict =
          true;
      }

      if (
        intersects(
          fixedTargets.classIds,
          blockedTargets.classIds,
        )
      ) {
        targetConflict =
          true;
      }

      if (
        !targetConflict
      ) {
        continue;
      }

      hardConflictCount +=
        1;

      issues.push({
        id:
          `constraint-conflict-${fixed.id}-${blocked.id}`,

        severity:
          "ERROR",

        category:
          "CONSTRAINTS",

        code:
          "FIXED_RULE_CONFLICT",

        title:
          "تثبيت يتعارض مع قيد منع",

        description:
          "يوجد تثبيت وقيد منع يؤثران على نفس الهدف وفي نفس الخانة الزمنية.",

        actionLabel:
          "فتح مراجعة القيود",

        href:
          `/dashboard/timetable-v2/${projectId}/constraints`,

        meta: {
          fixedConstraintId:
            fixed.id,

          blockedConstraintId:
            blocked.id,
        },
      });
    }
  }

  // =========================================================
  // Basic constraint quality
  // =========================================================

  const disabledConstraints =
    await prisma.timetableConstraint.count({
      where: {
        projectId,
        isActive: false,
      },
    });

  if (
    constraints.length ===
    0
  ) {
    issues.push({
      id:
        "no-constraints",

      severity:
        "INFO",

      category:
        "CONSTRAINTS",

      code:
        "NO_CONSTRAINTS",

      title:
        "لم تتم إضافة قيود",

      description:
        "يمكن إنشاء الجدول بدون قيود، لكن إضافة واقع المعلمين والمدرسة تحسن النتيجة.",

      actionLabel:
        "إضافة القيود",

      href:
        `/dashboard/timetable-v2/${projectId}/constraints`,
    });
  }

  // =========================================================
  // Score
  // =========================================================

  const errorCount =
    issues.filter(
      (issue) =>
        issue.severity ===
        "ERROR",
    ).length;

  const warningCount =
    issues.filter(
      (issue) =>
        issue.severity ===
        "WARNING",
    ).length;

  const infoCount =
    issues.filter(
      (issue) =>
        issue.severity ===
        "INFO",
    ).length;

  let score = 100;

  score -=
    Math.min(
      70,
      errorCount * 12,
    );

  score -=
    Math.min(
      20,
      warningCount * 4,
    );

  score -=
    Math.min(
      10,
      infoCount,
    );

  score =
    Math.max(
      0,
      Math.min(
        100,
        score,
      ),
    );

  const canGenerate =
    errorCount === 0;

  return {
    project,

    score,

    canGenerate,

    issues,

    summary: {
      errorCount,
      warningCount,
      infoCount,

      daysCount:
        days.length,

      teachingPeriodsCount:
        teachingPeriods.length,

      breaksCount:
        breaks.length,

      weeklySlotCount,

      teachersCount:
        activeTeachers.length,

      classesCount:
        classes.length,

      subjectsCount:
        subjects.length,

      requiredLessons,

      assignedLessons,

      fullyAssignedRows,

      underAssignedRows,

      overAssignedRows,

      assignmentsCount:
        assignments.length,

      constraintsCount:
        constraints.length,

      disabledConstraints,

      hardConstraintCount:
        constraints.filter(
          (constraint) =>
            constraint.strength ===
            "HARD",
        ).length,

      softConstraintCount:
        constraints.filter(
          (constraint) =>
            constraint.strength ===
            "SOFT",
        ).length,

      hardConflictCount,

      overloadedTeachers,

      teachersWithoutSpecialty,
    },
  };
}
