import {
  NextResponse,
} from "next/server";

import {
  requireTimetableApiAccess,
} from "@/lib/timetable/timetable-access";

import {
  loadTimetableV2GenerationProblemForSolver,
} from "@/lib/timetable-v2/generation/generation-service";

import {
  validateGeneratedTimetableV2,
} from "@/lib/timetable-v2/generation/generation-validator";

import {
  buildTimefoldSolveRequestV1,
} from "@/lib/timetable-v2/solver/timefold-v1-adapter";

import {
  solveWithTimefoldV1,
  TimefoldV1Error,
} from "@/lib/timetable-v2/solver/timefold-v1-client";

import {
  mapTimefoldV1ResultToGeneratedSessions,
} from "@/lib/timetable-v2/solver/timefold-v1-result-mapper";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

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
      fingerprint,
    } =
      await loadTimetableV2GenerationProblemForSolver(
        projectId,
        access.schoolAccountId!,
      );

    const solverRequest =
      buildTimefoldSolveRequestV1(
        problem,
        {
          seed:
            123456,

          spentLimitSeconds:
            60,
        },
      );

    const solverResult =
      await solveWithTimefoldV1(
        solverRequest,
      );

    const sessions =
      mapTimefoldV1ResultToGeneratedSessions(
        problem,
        solverResult,
      );

    /*
     * هذا هو الحكم الرسمي.
     *
     * Timefold يولد فقط.
     * Validator Teachix الحالي يقرر هل الجدول
     * مقبول وفق عقد Timetable V2 أم لا.
     */
    const validation =
      validateGeneratedTimetableV2(
        problem,
        sessions,
      );

    const teacherSlotKeys =
      new Set<string>();

    const classSlotKeys =
      new Set<string>();

    let teacherCollisions =
      0;

    let classCollisions =
      0;

    for (
      const session of
      sessions
    ) {
      const teacherKey =
        `${session.teacherId}:${session.dayId}:${session.periodId}`;

      const classKey =
        `${session.classId}:${session.dayId}:${session.periodId}`;

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

    const acceptedByTeachix =
      sessions.length ===
        solverResult.requiredSessions &&
      validation.valid &&
      validation.hardViolationCount ===
        0;

    return NextResponse.json({
      ok:
        true,

      testOnly:
        true,

      saved:
        false,

      fingerprint,

      requestSummary: {
        days:
          solverRequest.days.length,

        periods:
          solverRequest.periods.length,

        teachers:
          solverRequest.teachers.length,

        classes:
          solverRequest.classes.length,

        subjects:
          solverRequest.subjects.length,

        assignments:
          solverRequest.assignments.length,

        constraints:
          solverRequest.constraints.length,

        requiredSessions:
          solverRequest.assignments.reduce(
            (
              total,
              assignment,
            ) =>
              total +
              assignment.assignedLessons,
            0,
          ),
      },

      solver: {
        engine:
          solverResult.engine,

        success:
          solverResult.success,

        score:
          solverResult.score,

        hardScore:
          solverResult.hardScore,

        softScore:
          solverResult.softScore,

        requiredSessions:
          solverResult.requiredSessions,

        solvedSessions:
          solverResult.solvedSessions,

        blockCount:
          solverResult.blockCount,

        durationMs:
          solverResult.durationMs,

        diagnostics:
          solverResult.diagnostics,
      },

      teachix: {
        accepted:
          acceptedByTeachix,

        generatedSessions:
          sessions.length,

        teacherCollisions,

        classCollisions,

        validation: {
          valid:
            validation.valid,

          hardViolationCount:
            validation.hardViolationCount,

          issues:
            validation.issues,
        },
      },

      comparison: {
        solverSaysFeasible:
          solverResult.hardScore >=
          0,

        teachixSaysFeasible:
          validation.valid &&
          validation.hardViolationCount ===
            0,

        scoreModelAgreement:
          (
            solverResult.hardScore >=
            0
          ) ===
          (
            validation.valid &&
            validation.hardViolationCount ===
              0
          ),
      },
    });
  }
  catch (error) {
    console.error(
      "TIMETABLE_V2_TIMEFOLD_V1_TEST_FAILED",
      {
        projectId,
        error,
      },
    );

    if (
      error instanceof
        TimefoldV1Error
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            error.message,

          solverStatus:
            error.status,

          solverPayload:
            error.payload,
        },
        {
          status:
            502,
        },
      );
    }

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error instanceof Error
            ? error.message
            : "TIMEFOLD_V1_TEST_FAILED",
      },
      {
        status:
          500,
      },
    );
  }
}