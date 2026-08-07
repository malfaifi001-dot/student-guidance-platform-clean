import {
  normalizeGenerationConstraintType,
} from "./constraint-type-normalizer";

import type {
  GeneratedSession,
  GenerationConstraint,
  GenerationProblem,
  GenerationValidationIssue,
  GenerationValidationResult,
} from "./generation-domain";

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

function matchesTarget(
  values: string[],
  value: string,
) {
  return (
    values.length === 0 ||
    values.includes(value)
  );
}

function matchesSession(
  constraint:
    GenerationConstraint,
  session:
    GeneratedSession,
) {
  return (
    matchesTarget(
      constraint.teacherIds,
      session.teacherId,
    ) &&
    matchesTarget(
      constraint.subjectIds,
      session.subjectId,
    ) &&
    matchesTarget(
      constraint.classIds,
      session.classId,
    )
  );
}

function constraintContainsSlot(
  constraint:
    GenerationConstraint,
  dayId: string,
  periodId: string,
) {
  if (
    constraint.slots.length >
    0
  ) {
    return constraint.slots.some(
      (slot) =>
        slot.dayId === dayId &&
        slot.periodId === periodId,
    );
  }

  if (
    constraint.dayIds.length >
      0 &&
    !constraint.dayIds.includes(
      dayId,
    )
  ) {
    return false;
  }

  if (
    constraint.periodIds.length >
      0 &&
    !constraint.periodIds.includes(
      periodId,
    )
  ) {
    return false;
  }

  return (
    constraint.dayIds.length >
      0 ||
    constraint.periodIds.length >
      0
  );
}

function longestConsecutive(
  orders: number[],
) {
  const sorted =
    [...new Set(orders)]
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
    const order of
    sorted
  ) {
    if (
      previous !== null &&
      order ===
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
      order;
  }

  return longest;
}

function addIssue(
  issues:
    GenerationValidationIssue[],
  code: string,
  message: string,
  entityId?: string,
) {
  issues.push({
    code,
    message,
    entityId,
  });
}

function sessionsForTeacherDay(
  sessions:
    GeneratedSession[],
  teacherId: string,
  dayId: string,
) {
  return sessions.filter(
    (session) =>
      session.teacherId ===
        teacherId &&
      session.dayId ===
        dayId,
  );
}

function sessionsForClassDay(
  sessions:
    GeneratedSession[],
  classId: string,
  dayId: string,
) {
  return sessions.filter(
    (session) =>
      session.classId ===
        classId &&
      session.dayId ===
        dayId,
  );
}

function sessionsForSubjectClassDay(
  sessions:
    GeneratedSession[],
  subjectId: string,
  classId: string,
  dayId: string,
) {
  return sessions.filter(
    (session) =>
      session.subjectId ===
        subjectId &&
      session.classId ===
        classId &&
      session.dayId ===
        dayId,
  );
}

function validateStructuralRules(
  problem:
    GenerationProblem,
  sessions:
    GeneratedSession[],
  issues:
    GenerationValidationIssue[],
) {
  const validDays =
    new Set(
      problem.days.map(
        (day) =>
          day.id,
      ),
    );

  const validPeriods =
    new Set(
      problem.periods.map(
        (period) =>
          period.id,
      ),
    );

  const teacherBusy =
    new Set<string>();

  const classBusy =
    new Set<string>();

  for (
    const session of
    sessions
  ) {
    if (
      !validDays.has(
        session.dayId,
      ) ||
      !validPeriods.has(
        session.periodId,
      )
    ) {
      addIssue(
        issues,
        "INVALID_SESSION_SLOT",
        `الحصة ${session.subjectName} تشير إلى يوم أو حصة غير موجودة.`,
        session.temporaryId,
      );
    }

    const teacherKey =
      teacherSlotKey(
        session.teacherId,
        session.dayId,
        session.periodId,
      );

    if (
      teacherBusy.has(
        teacherKey,
      )
    ) {
      addIssue(
        issues,
        "TEACHER_SLOT_COLLISION",
        `المعلم ${session.teacherName} موجود في أكثر من فصل في نفس الوقت.`,
        session.teacherId,
      );
    }

    teacherBusy.add(
      teacherKey,
    );

    const classKey =
      classSlotKey(
        session.classId,
        session.dayId,
        session.periodId,
      );

    if (
      classBusy.has(
        classKey,
      )
    ) {
      addIssue(
        issues,
        "CLASS_SLOT_COLLISION",
        `الفصل ${session.className} لديه أكثر من حصة في نفس الوقت.`,
        session.classId,
      );
    }

    classBusy.add(
      classKey,
    );
  }

  for (
    const assignment of
    problem.assignments
  ) {
    const actual =
      sessions.filter(
        (session) =>
          session.assignmentId ===
          assignment.id,
      ).length;

    if (
      actual !==
      assignment.assignedLessons
    ) {
      addIssue(
        issues,
        "ASSIGNMENT_SESSION_COUNT_MISMATCH",
        `الإسناد ${assignment.teacherName} / ${assignment.subjectName} / ${assignment.className}: المطلوب ${assignment.assignedLessons} والمنفذ ${actual}.`,
        assignment.id,
      );
    }
  }

  const blocks =
    new Map<
      string,
      GeneratedSession[]
    >();

  for (
    const session of
    sessions
  ) {
    const list =
      blocks.get(
        session.blockId,
      ) ?? [];

    list.push(
      session,
    );

    blocks.set(
      session.blockId,
      list,
    );
  }

  for (
    const [
      blockId,
      blockSessions,
    ] of blocks
  ) {
    const expected =
      blockSessions[0]
        ?.blockLength ??
      1;

    if (
      blockSessions.length !==
      expected
    ) {
      addIssue(
        issues,
        "BLOCK_LENGTH_MISMATCH",
        `الكتلة ${blockId} غير مكتملة.`,
        blockId,
      );

      continue;
    }

    if (
      expected !== 2
    ) {
      continue;
    }

    const ordered =
      [...blockSessions]
        .sort(
          (a, b) =>
            a.periodOrder -
            b.periodOrder,
        );

    if (
      ordered[0].dayId !==
        ordered[1].dayId ||
      ordered[1].periodOrder !==
        ordered[0].periodOrder +
          1
    ) {
      addIssue(
        issues,
        "DOUBLE_BLOCK_NOT_CONSECUTIVE",
        `الحصة المزدوجة ${ordered[0].subjectName} ليست متتالية.`,
        blockId,
      );
    }
  }
}

function validateHardConstraint(
  problem:
    GenerationProblem,
  sessions:
    GeneratedSession[],
  constraint:
    GenerationConstraint,
  issues:
    GenerationValidationIssue[],
) {
  const type =
    normalizeGenerationConstraintType(
      constraint.type,
    );

  if (
    type ===
    "TEACHER_UNAVAILABLE"
  ) {
    for (
      const session of
      sessions
    ) {
      if (
        constraint.teacherIds.includes(
          session.teacherId,
        ) &&
        constraintContainsSlot(
          constraint,
          session.dayId,
          session.periodId,
        )
      ) {
        addIssue(
          issues,
          "TEACHER_UNAVAILABLE_VIOLATION",
          `المعلم ${session.teacherName} لديه حصة في وقت غير متاح.`,
          constraint.id,
        );
      }
    }

    return;
  }

  if (
    type ===
    "TEACHER_DAY_OFF"
  ) {
    for (
      const session of
      sessions
    ) {
      if (
        constraint.teacherIds.includes(
          session.teacherId,
        ) &&
        constraint.dayIds.includes(
          session.dayId,
        )
      ) {
        addIssue(
          issues,
          "TEACHER_DAY_OFF_VIOLATION",
          `المعلم ${session.teacherName} لديه حصة في يوم راحة.`,
          constraint.id,
        );
      }
    }

    return;
  }

  if (
    type ===
    "TEACHER_MAX_DAILY" &&
    constraint.valueInt !==
      null
  ) {
    for (
      const teacherId of
      constraint.teacherIds
    ) {
      for (
        const day of
        problem.days
      ) {
        const count =
          sessionsForTeacherDay(
            sessions,
            teacherId,
            day.id,
          ).length;

        if (
          count >
          constraint.valueInt
        ) {
          addIssue(
            issues,
            "TEACHER_MAX_DAILY_VIOLATION",
            `تجاوز المعلم الحد اليومي ${constraint.valueInt}.`,
            constraint.id,
          );
        }
      }
    }

    return;
  }

  if (
    type ===
    "TEACHER_MIN_DAILY" &&
    constraint.valueInt !==
      null
  ) {
    for (
      const teacherId of
      constraint.teacherIds
    ) {
      for (
        const day of
        problem.days
      ) {
        const count =
          sessionsForTeacherDay(
            sessions,
            teacherId,
            day.id,
          ).length;

        if (
          count > 0 &&
          count <
            constraint.valueInt
        ) {
          addIssue(
            issues,
            "TEACHER_MIN_DAILY_VIOLATION",
            `لدى المعلم ${count} حصة في اليوم بينما الحد الأدنى ${constraint.valueInt}.`,
            constraint.id,
          );
        }
      }
    }

    return;
  }

  if (
    type ===
    "TEACHER_MAX_CONSECUTIVE" &&
    constraint.valueInt !==
      null
  ) {
    for (
      const teacherId of
      constraint.teacherIds
    ) {
      for (
        const day of
        problem.days
      ) {
        const longest =
          longestConsecutive(
            sessionsForTeacherDay(
              sessions,
              teacherId,
              day.id,
            ).map(
              (session) =>
                session.periodOrder,
            ),
          );

        if (
          longest >
          constraint.valueInt
        ) {
          addIssue(
            issues,
            "TEACHER_MAX_CONSECUTIVE_VIOLATION",
            `تجاوز المعلم الحد الأعلى للحصص المتتالية ${constraint.valueInt}.`,
            constraint.id,
          );
        }
      }
    }

    return;
  }

  if (
    type ===
    "SUBJECT_BLOCKED"
  ) {
    for (
      const session of
      sessions
    ) {
      if (
        constraint.subjectIds.includes(
          session.subjectId,
        ) &&
        matchesTarget(
          constraint.classIds,
          session.classId,
        ) &&
        constraintContainsSlot(
          constraint,
          session.dayId,
          session.periodId,
        )
      ) {
        addIssue(
          issues,
          "SUBJECT_BLOCKED_VIOLATION",
          `تم وضع ${session.subjectName} في وقت ممنوع.`,
          constraint.id,
        );
      }
    }

    return;
  }

  if (
    type ===
    "SUBJECT_SPECIFIC_TEACHER"
  ) {
    for (
      const session of
      sessions
    ) {
      if (
        constraint.subjectIds.includes(
          session.subjectId,
        ) &&
        matchesTarget(
          constraint.classIds,
          session.classId,
        ) &&
        !constraint.teacherIds.includes(
          session.teacherId,
        )
      ) {
        addIssue(
          issues,
          "SUBJECT_SPECIFIC_TEACHER_VIOLATION",
          `المادة ${session.subjectName} أُسندت إلى معلم غير مسموح له بهذا القيد.`,
          constraint.id,
        );
      }
    }

    return;
  }

  if (
    type ===
    "SUBJECT_MAX_DAILY" &&
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
          !matchesTarget(
            constraint.classIds,
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
            sessionsForSubjectClassDay(
              sessions,
              subjectId,
              classItem.id,
              day.id,
            ).length;

          if (
            count >
            constraint.valueInt
          ) {
            addIssue(
              issues,
              "SUBJECT_MAX_DAILY_VIOLATION",
              `تجاوزت المادة الحد اليومي ${constraint.valueInt}.`,
              constraint.id,
            );
          }
        }
      }
    }

    return;
  }

  if (
    type ===
    "CLASS_BLOCKED_SLOT"
  ) {
    for (
      const session of
      sessions
    ) {
      if (
        constraint.classIds.includes(
          session.classId,
        ) &&
        constraintContainsSlot(
          constraint,
          session.dayId,
          session.periodId,
        )
      ) {
        addIssue(
          issues,
          "CLASS_BLOCKED_SLOT_VIOLATION",
          `الفصل ${session.className} لديه حصة في وقت ممنوع.`,
          constraint.id,
        );
      }
    }

    return;
  }

  if (
    type ===
    "CLASS_MAX_DAILY" &&
    constraint.valueInt !==
      null
  ) {
    for (
      const classId of
      constraint.classIds
    ) {
      for (
        const day of
        problem.days
      ) {
        const count =
          sessionsForClassDay(
            sessions,
            classId,
            day.id,
          ).length;

        if (
          count >
          constraint.valueInt
        ) {
          addIssue(
            issues,
            "CLASS_MAX_DAILY_VIOLATION",
            `تجاوز الفصل الحد اليومي ${constraint.valueInt}.`,
            constraint.id,
          );
        }
      }
    }

    return;
  }

  if (
    type ===
    "CLASS_MAX_CONSECUTIVE" &&
    constraint.valueInt !==
      null
  ) {
    for (
      const classId of
      constraint.classIds
    ) {
      for (
        const day of
        problem.days
      ) {
        const longest =
          longestConsecutive(
            sessionsForClassDay(
              sessions,
              classId,
              day.id,
            ).map(
              (session) =>
                session.periodOrder,
            ),
          );

        if (
          longest >
          constraint.valueInt
        ) {
          addIssue(
            issues,
            "CLASS_MAX_CONSECUTIVE_VIOLATION",
            `تجاوز الفصل الحد الأعلى للحصص المتتالية ${constraint.valueInt}.`,
            constraint.id,
          );
        }
      }
    }

    return;
  }

  if (
    type ===
    "CLASS_NO_DOUBLE"
  ) {
    for (
      const classId of
      constraint.classIds
    ) {
      for (
        const day of
        problem.days
      ) {
        const daySessions =
          sessionsForClassDay(
            sessions,
            classId,
            day.id,
          );

        for (
          const session of
          daySessions
        ) {
          if (
            session.blockLength ===
            2
          ) {
            addIssue(
              issues,
              "CLASS_NO_DOUBLE_BLOCK_VIOLATION",
              `الفصل ${session.className} يحتوي حصة مزدوجة رغم المنع.`,
              constraint.id,
            );

            break;
          }

          const adjacentSameSubject =
            daySessions.some(
              (other) =>
                other.temporaryId !==
                  session.temporaryId &&
                other.subjectId ===
                  session.subjectId &&
                Math.abs(
                  other.periodOrder -
                    session.periodOrder,
                ) === 1,
            );

          if (
            adjacentSameSubject
          ) {
            addIssue(
              issues,
              "CLASS_NO_DOUBLE_ADJACENCY_VIOLATION",
              `الفصل ${session.className} لديه حصتان متتاليتان لنفس المادة رغم المنع.`,
              constraint.id,
            );

            break;
          }
        }
      }
    }

    return;
  }

  if (
    type ===
    "SCHOOL_BLOCKED_SLOT"
  ) {
    for (
      const session of
      sessions
    ) {
      if (
        constraintContainsSlot(
          constraint,
          session.dayId,
          session.periodId,
        )
      ) {
        addIssue(
          issues,
          "SCHOOL_BLOCKED_SLOT_VIOLATION",
          "تم وضع حصة في وقت معطل على مستوى المدرسة.",
          constraint.id,
        );
      }
    }

    return;
  }

  if (
    type ===
    "FIXED_ASSIGNMENT"
  ) {
    for (
      const slot of
      constraint.slots
    ) {
      const found =
        sessions.some(
          (session) =>
            session.dayId ===
              slot.dayId &&
            session.periodId ===
              slot.periodId &&
            matchesSession(
              constraint,
              session,
            ),
        );

      if (!found) {
        addIssue(
          issues,
          "FIXED_ASSIGNMENT_VIOLATION",
          "لم يتم تنفيذ إسناد مثبت في خلية إلزامية.",
          constraint.id,
        );
      }
    }

    return;
  }

  if (
    type ===
    "FIXED_SUBJECT_DAY"
  ) {
    for (
      const dayId of
      constraint.dayIds
    ) {
      const found =
        sessions.some(
          (session) =>
            session.dayId ===
              dayId &&
            matchesTarget(
              constraint.subjectIds,
              session.subjectId,
            ) &&
            matchesTarget(
              constraint.classIds,
              session.classId,
            ),
        );

      if (!found) {
        addIssue(
          issues,
          "FIXED_SUBJECT_DAY_VIOLATION",
          "لم يتم وضع المادة والفصل في اليوم المثبت.",
          constraint.id,
        );
      }
    }

    return;
  }

  if (
    type ===
    "FIXED_TEACHER_SLOT"
  ) {
    for (
      const slot of
      constraint.slots
    ) {
      for (
        const teacherId of
        constraint.teacherIds
      ) {
        const found =
          sessions.some(
            (session) =>
              session.teacherId ===
                teacherId &&
              session.dayId ===
                slot.dayId &&
              session.periodId ===
                slot.periodId,
          );

        if (!found) {
          addIssue(
            issues,
            "FIXED_TEACHER_SLOT_VIOLATION",
            "لم يتم وضع المعلم في الخلية المثبتة.",
            constraint.id,
          );
        }
      }
    }

    return;
  }

  if (
    type ===
    "NO_ISOLATED_PERIOD"
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
          !matchesTarget(
            constraint.classIds,
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
            sessionsForSubjectClassDay(
              sessions,
              subjectId,
              classItem.id,
              day.id,
            ).length;

          if (
            count === 1
          ) {
            addIssue(
              issues,
              "NO_ISOLATED_PERIOD_VIOLATION",
              "ظهرت حصة مادة منفردة في يوم رغم منع الحصة المعزولة.",
              constraint.id,
            );
          }
        }
      }
    }
  }
}

export function validateGeneratedTimetableV2(
  problem:
    GenerationProblem,
  sessions:
    GeneratedSession[],
): GenerationValidationResult {
  const issues:
    GenerationValidationIssue[] =
      [];

  validateStructuralRules(
    problem,
    sessions,
    issues,
  );

  for (
    const constraint of
    problem.constraints
  ) {
    if (
      constraint.strength !==
      "HARD"
    ) {
      continue;
    }

    validateHardConstraint(
      problem,
      sessions,
      constraint,
      issues,
    );
  }

  return {
    valid:
      issues.length === 0,

    hardViolationCount:
      issues.length,

    issues,
  };
}