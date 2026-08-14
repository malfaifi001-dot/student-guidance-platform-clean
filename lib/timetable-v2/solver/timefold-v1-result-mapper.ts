import type {
  GeneratedSession,
  GenerationProblem,
} from "../generation/generation-domain";

import type {
  TimefoldSolveResultV1,
} from "./timefold-v1-types";

export function mapTimefoldV1ResultToGeneratedSessions(
  problem: GenerationProblem,
  result: TimefoldSolveResultV1,
): GeneratedSession[] {
  const assignments =
    new Map(
      problem.assignments.map(
        (assignment) => [
          assignment.id,
          assignment,
        ],
      ),
    );

  const teachers =
    new Map(
      problem.teachers.map(
        (teacher) => [
          teacher.id,
          teacher,
        ],
      ),
    );

  const classes =
    new Map(
      problem.classes.map(
        (classItem) => [
          classItem.id,
          classItem,
        ],
      ),
    );

  const subjects =
    new Map(
      problem.subjects.map(
        (subject) => [
          subject.id,
          subject,
        ],
      ),
    );

  const days =
    new Map(
      problem.days.map(
        (day) => [
          day.id,
          day,
        ],
      ),
    );

  const periods =
    new Map(
      problem.periods.map(
        (period) => [
          period.id,
          period,
        ],
      ),
    );

  const sessions:
    GeneratedSession[] =
      [];

  for (
    const block of
    result.blocks
  ) {
    if (
      block.length !== 1 &&
      block.length !== 2
    ) {
      throw new Error(
        `TIMEFOLD_V1_INVALID_BLOCK_LENGTH:${block.blockId}:${block.length}`,
      );
    }

    if (
      block.occupiedSlots.length !==
      block.length
    ) {
      throw new Error(
        `TIMEFOLD_V1_INCOMPLETE_BLOCK:${block.blockId}`,
      );
    }

    const assignment =
      assignments.get(
        block.assignmentId,
      );

    const teacher =
      teachers.get(
        block.teacherId,
      );

    const classItem =
      classes.get(
        block.classId,
      );

    const subject =
      subjects.get(
        block.subjectId,
      );

    if (
      !assignment ||
      !teacher ||
      !classItem ||
      !subject
    ) {
      throw new Error(
        `TIMEFOLD_V1_UNKNOWN_REFERENCE:${block.blockId}`,
      );
    }

    for (
      let index = 0;
      index <
      block.occupiedSlots.length;
      index += 1
    ) {
      const occupied =
        block.occupiedSlots[index];

      const day =
        days.get(
          occupied.dayId,
        );

      const period =
        periods.get(
          occupied.periodId,
        );

      if (
        !day ||
        !period
      ) {
        throw new Error(
          `TIMEFOLD_V1_UNKNOWN_SLOT:${block.blockId}:${occupied.dayId}:${occupied.periodId}`,
        );
      }

      const fixed =
        assignment.fixedSlots.find(
          (slot) =>
            slot.dayId ===
              occupied.dayId &&
            slot.periodId ===
              occupied.periodId &&
            slot.isLocked,
        );

      sessions.push({
        temporaryId:
          `${block.blockId}:${index}`,

        blockId:
          block.blockId,

        blockIndex:
          index,

        blockLength:
          block.length,

        assignmentId:
          block.assignmentId,

        teacherId:
          block.teacherId,

        teacherName:
          teacher.name,

        classId:
          block.classId,

        className:
          classItem.name,

        subjectId:
          block.subjectId,

        subjectName:
          subject.name,

        dayId:
          occupied.dayId,

        dayLabel:
          day.label,

        periodId:
          occupied.periodId,

        periodLabel:
          period.label,

        periodOrder:
          period.order,

        isLocked:
          Boolean(
            fixed,
          ),

        source:
          fixed
            ? "FIXED_ASSIGNMENT"
            : "GENERATED",

        placementScore:
          0,
      });
    }
  }

  return sessions;
}