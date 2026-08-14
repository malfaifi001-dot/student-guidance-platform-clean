import {
  NextResponse,
} from "next/server";

import {
  requireTimetableApiAccess,
} from "@/lib/timetable/timetable-access";

import {
  loadTimetableV2GenerationProblemForSolver,
} from "@/lib/timetable-v2/generation/generation-service";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

type TimefoldResponse = {
  success: boolean;
  score: string | null;
  hardScore: number;
  softScore: number;
  solvedLessons: number;
  durationMs: number;

  lessons: Array<{
    id: string;
    teacherId: string;
    classId: string;
    subjectId: string;
    dayId: string | null;
    periodId: string | null;
  }>;

  constraintDiagnostics: Array<{
    constraintId: string;
    score: string;
    hardScore: number;
    softScore: number;
    matchCount: number;
  }>;
};

function isSupportedConstraint(
  type: string,
  strength: string,
) {
  if (
    strength === "HARD"
  ) {
    return [
      "TEACHER_DAY_OFF",
      "TEACHER_UNAVAILABLE",
      "TEACHER_UNAVAILABLE_SLOT",
      "TEACHER_MAX_DAILY",
      "TEACHER_DAILY_LIMIT",
      "TEACHER_MAX_DAILY_PERIODS",
      "TEACHER_MAX_CONSECUTIVE",
      "TEACHER_CONSECUTIVE_LIMIT",
      "TEACHER_MAX_CONSECUTIVE_PERIODS",
      "SUBJECT_DAILY_LIMIT",
      "SUBJECT_MAX_DAILY",
      "SUBJECT_MAX_DAILY_OCCURRENCES",
      "SUBJECT_BLOCKED",
      "SUBJECT_FORBIDDEN_SLOT",
    ].includes(type);
  }

  if (
    strength === "SOFT"
  ) {
    return type ===
      "SUBJECT_PREFERRED";
  }

  return false;
}

export async function POST(
  _request: Request,
  context: Context,
) {
  const access =
    await requireTimetableApiAccess({
      requireActiveSubscription:
        true,
    });

  if (!access.ok) {
    return access.response;
  }

  const {
    projectId,
  } =
    await context.params;

  try {
    const {
      problem,
    } =
      await loadTimetableV2GenerationProblemForSolver(
        projectId,
        access.schoolAccountId!,
      );

    const unsupportedConstraints =
      problem.constraints.filter(
        (constraint) =>
          !isSupportedConstraint(
            constraint.type,
            constraint.strength,
          ),
      );

    if (
      unsupportedConstraints.length >
      0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "TIMEFOLD_POC_UNSUPPORTED_CONSTRAINT",

          unsupported:
            unsupportedConstraints.map(
              (constraint) => ({
                id:
                  constraint.id,

                type:
                  constraint.type,

                strength:
                  constraint.strength,
              }),
            ),
        },
        {
          status:
            409,
        },
      );
    }

    const unsupportedAssignment =
      problem.assignments.find(
        (assignment) =>
          assignment.doublePeriods >
            0 ||
          assignment.fixedSlots.length >
            0,
      );

    if (
      unsupportedAssignment
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "TIMEFOLD_POC_ASSIGNMENT_NOT_SUPPORTED",

          assignmentId:
            unsupportedAssignment.id,
        },
        {
          status:
            409,
        },
      );
    }

    const lessons =
      problem.assignments.flatMap(
        (assignment) =>
          Array.from(
            {
              length:
                assignment.assignedLessons,
            },
            (
              _,
              index,
            ) => ({
              id:
                `${assignment.id}:lesson:${index + 1}`,

              teacherId:
                assignment.teacherId,

              classId:
                assignment.classId,

              subjectId:
                assignment.subjectId,
            }),
          ),
      );

    const response =
      await fetch(
        "http://127.0.0.1:8091/solve",
        {
          method:
            "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body:
            JSON.stringify({
              days:
                problem.days,

              periods:
                problem.periods,

              lessons,

              constraints:
                problem.constraints.map(
                  (constraint) => ({
                    id:
                      constraint.id,

                    type:
                      constraint.type,

                    strength:
                      constraint.strength,

                    valueInt:
                      constraint.valueInt,

                    weight:
                      constraint.weight,

                    teacherIds:
                      constraint.teacherIds,

                    subjectIds:
                      constraint.subjectIds,

                    classIds:
                      constraint.classIds,

                    dayIds:
                      constraint.dayIds,

                    periodIds:
                      constraint.periodIds,

                    slots:
                      constraint.slots,
                  }),
                ),
            }),

          cache:
            "no-store",
        },
      );

    const payload =
      await response.json() as
        TimefoldResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "TIMEFOLD_REQUEST_FAILED",

          payload,
        },
        {
          status:
            502,
        },
      );
    }

    const teacherSlotKeys =
      new Set<string>();

    const classSlotKeys =
      new Set<string>();

    let teacherCollisions =
      0;

    let classCollisions =
      0;

    for (
      const lesson of
      payload.lessons
    ) {
      if (
        !lesson.dayId ||
        !lesson.periodId
      ) {
        continue;
      }

      const teacherKey =
        `${lesson.teacherId}:${lesson.dayId}:${lesson.periodId}`;

      const classKey =
        `${lesson.classId}:${lesson.dayId}:${lesson.periodId}`;

      if (
        teacherSlotKeys.has(
          teacherKey,
        )
      ) {
        teacherCollisions +=
          1;
      }

      if (
        classSlotKeys.has(
          classKey,
        )
      ) {
        classCollisions +=
          1;
      }

      teacherSlotKeys.add(
        teacherKey,
      );

      classSlotKeys.add(
        classKey,
      );
    }

    const hardDiagnostics: Array<{
      id: string;
      type: string;
      violations: number;
      details: string[];
    }> = [];

    const periodOrderById =
      new Map(
        problem.periods.map(
          (period) => [
            period.id,
            period.order,
          ],
        ),
      );

    const slotMatchesConstraint = (
      constraint: (typeof problem.constraints)[number],
      dayId: string,
      periodId: string,
    ) => {
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

      const dayMatches =
        constraint.dayIds.length === 0 ||
        constraint.dayIds.includes(dayId);

      const periodMatches =
        constraint.periodIds.length === 0 ||
        constraint.periodIds.includes(periodId);

      return (
        (constraint.dayIds.length > 0 ||
          constraint.periodIds.length > 0) &&
        dayMatches &&
        periodMatches
      );
    };

    for (
      const constraint of
      problem.constraints
    ) {
      if (
        constraint.strength !== "HARD"
      ) {
        continue;
      }

      let violations = 0;
      const details: string[] = [];

      if (
        constraint.type === "TEACHER_DAY_OFF"
      ) {
        for (
          const lesson of
          payload.lessons
        ) {
          if (
            lesson.dayId &&
            constraint.teacherIds.includes(
              lesson.teacherId,
            ) &&
            constraint.dayIds.includes(
              lesson.dayId,
            )
          ) {
            violations += 1;
            details.push(
              `${lesson.teacherId}:${lesson.dayId}:${lesson.periodId}`,
            );
          }
        }
      }

      if (
        constraint.type === "TEACHER_UNAVAILABLE"
      ) {
        for (
          const lesson of
          payload.lessons
        ) {
          if (
            lesson.dayId &&
            lesson.periodId &&
            constraint.teacherIds.includes(
              lesson.teacherId,
            ) &&
            slotMatchesConstraint(
              constraint,
              lesson.dayId,
              lesson.periodId,
            )
          ) {
            violations += 1;
            details.push(
              `${lesson.teacherId}:${lesson.dayId}:${lesson.periodId}`,
            );
          }
        }
      }

      if (
        constraint.type === "SUBJECT_BLOCKED"
      ) {
        for (
          const lesson of
          payload.lessons
        ) {
          if (
            lesson.dayId &&
            lesson.periodId &&
            constraint.subjectIds.includes(
              lesson.subjectId,
            ) &&
            (
              constraint.classIds.length === 0 ||
              constraint.classIds.includes(
                lesson.classId,
              )
            ) &&
            slotMatchesConstraint(
              constraint,
              lesson.dayId,
              lesson.periodId,
            )
          ) {
            violations += 1;
            details.push(
              `${lesson.subjectId}:${lesson.classId}:${lesson.dayId}:${lesson.periodId}`,
            );
          }
        }
      }

      if (
        constraint.type === "TEACHER_MAX_DAILY" &&
        constraint.valueInt !== null
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
              payload.lessons.filter(
                (lesson) =>
                  lesson.teacherId === teacherId &&
                  lesson.dayId === day.id,
              ).length;

            if (
              count >
              constraint.valueInt
            ) {
              violations +=
                count -
                constraint.valueInt;

              details.push(
                `${teacherId}:${day.id}=${count}>${constraint.valueInt}`,
              );
            }
          }
        }
      }

      if (
        constraint.type ===
          "TEACHER_MAX_CONSECUTIVE" &&
        constraint.valueInt !== null
      ) {
        for (
          const teacherId of
          constraint.teacherIds
        ) {
          for (
            const day of
            problem.days
          ) {
            const orders =
              payload.lessons
                .filter(
                  (lesson) =>
                    lesson.teacherId ===
                      teacherId &&
                    lesson.dayId ===
                      day.id &&
                    lesson.periodId !==
                      null,
                )
                .map(
                  (lesson) =>
                    periodOrderById.get(
                      lesson.periodId!,
                    ),
                )
                .filter(
                  (order):
                    order is number =>
                      order !== undefined,
                )
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
              orders
            ) {
              if (
                previous !== null &&
                order === previous + 1
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

            if (
              longest >
              constraint.valueInt
            ) {
              violations +=
                longest -
                constraint.valueInt;

              details.push(
                `${teacherId}:${day.id} longest=${longest}>${constraint.valueInt}`,
              );
            }
          }
        }
      }

      if (
        (
          constraint.type ===
            "SUBJECT_DAILY_LIMIT" ||
          constraint.type ===
            "SUBJECT_MAX_DAILY"
        ) &&
        constraint.valueInt !== null
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

          for (
            const day of
            problem.days
          ) {
            const count =
              payload.lessons.filter(
                (lesson) =>
                  lesson.subjectId ===
                    subjectId &&
                  lesson.classId ===
                    classItem.id &&
                  lesson.dayId ===
                    day.id,
              ).length;

            if (
              count >
              constraint.valueInt
            ) {
              violations +=
                count -
                constraint.valueInt;

              details.push(
                `${subjectId}:${classItem.id}:${day.id}=${count}>${constraint.valueInt}`,
              );
            }
          }
        }
        }
      }

      if (
        violations > 0
      ) {
        hardDiagnostics.push({
          id:
            constraint.id,
          type:
            constraint.type,
          violations,
          details:
            details.slice(
              0,
              20,
            ),
        });
      }
    }
    const initializedLessons =
      payload.lessons.filter(
        (lesson) =>
          lesson.dayId !== null &&
          lesson.periodId !== null,
      ).length;

    return NextResponse.json({
      success:
        payload.success,

      engine:
        "timefold-poc-2.3.0",

      projectId,

      constraintCount:
        problem.constraints.length,

      requiredLessons:
        lessons.length,

      solvedLessons:
        payload.solvedLessons,

      initializedLessons,

      score:
        payload.score,

      hardScore:
        payload.hardScore,

      softScore:
        payload.softScore,

      durationMs:
        payload.durationMs,

      teacherCollisions,

      classCollisions,

      hardDiagnostics,

      constraintDiagnostics:
        payload.constraintDiagnostics,

      note:
        "اختبار Timefold بالقيود - لم يتم حفظ أي نسخة جدول.",
    });
  }
  catch (error) {
    console.error(
      "TIMETABLE_V2_TIMEFOLD_TEST_FAILED",
      {
        projectId,
        error,
      },
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : "تعذر تشغيل اختبار Timefold.",
      },
      {
        status:
          500,
      },
    );
  }
}
