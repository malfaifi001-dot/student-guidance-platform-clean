import type {
  GenerationProblem,
} from "../generation/generation-domain";

import type {
  TimefoldSolveRequestV1,
} from "./timefold-v1-types";

export function buildTimefoldSolveRequestV1(
  problem: GenerationProblem,
  options?: {
    seed?: number;
    spentLimitSeconds?: number;
  },
): TimefoldSolveRequestV1 {
  return {
    contractVersion:
      "1",

    projectId:
      problem.projectId,

    days:
      problem.days.map(
        (day) => ({
          id:
            day.id,

          label:
            day.label,

          order:
            day.order,
        }),
      ),

    periods:
      problem.periods.map(
        (period) => ({
          id:
            period.id,

          label:
            period.label,

          order:
            period.order,
        }),
      ),

    teachers:
      problem.teachers.map(
        (teacher) => ({
          id:
            teacher.id,

          name:
            teacher.name,

          maxWeeklyLoad:
            teacher.maxWeeklyLoad,
        }),
      ),

    classes:
      problem.classes.map(
        (classItem) => ({
          id:
            classItem.id,

          name:
            classItem.name,
        }),
      ),

    subjects:
      problem.subjects.map(
        (subject) => ({
          id:
            subject.id,

          name:
            subject.name,
        }),
      ),

    assignments:
      problem.assignments.map(
        (assignment) => ({
          id:
            assignment.id,

          teacherId:
            assignment.teacherId,

          classId:
            assignment.classId,

          subjectId:
            assignment.subjectId,

          assignedLessons:
            assignment.assignedLessons,

          singlePeriods:
            assignment.singlePeriods,

          doublePeriods:
            assignment.doublePeriods,

          fixedSlots:
            assignment.fixedSlots.map(
              (slot) => ({
                dayId:
                  slot.dayId,

                periodId:
                  slot.periodId,

                locked:
                  slot.isLocked,
              }),
            ),
        }),
      ),

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
            [...constraint.teacherIds],

          subjectIds:
            [...constraint.subjectIds],

          classIds:
            [...constraint.classIds],

          dayIds:
            [...constraint.dayIds],

          periodIds:
            [...constraint.periodIds],

          slots:
            constraint.slots.map(
              (slot) => ({
                dayId:
                  slot.dayId,

                periodId:
                  slot.periodId,
              }),
            ),

          config:
            constraint.configJson ?? {},
        }),
      ),

    options: {
      seed:
        options?.seed ??
        null,

      spentLimitSeconds:
        options?.spentLimitSeconds ??
        null,
    },
  };
}