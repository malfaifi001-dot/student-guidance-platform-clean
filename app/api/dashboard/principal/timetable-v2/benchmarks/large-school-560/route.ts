import {
  NextResponse,
} from "next/server";

import {
  requireTimetableApiAccess,
} from "@/lib/timetable/timetable-access";

import {
  createLargeSchool560GenerationProblem,
  getLargeSchool560BenchmarkSummary,
} from "@/lib/timetable-v2/benchmarks/large-school-560-scenario";

import {
  analyzeTimetableV2Feasibility,
} from "@/lib/timetable-v2/feasibility";

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

async function authorize() {
  return requireTimetableApiAccess({
    requireActiveSubscription:
      true,
  });
}

export async function GET() {
  const access =
    await authorize();

  if (!access.ok) {
    return access.response;
  }

  const problem =
    createLargeSchool560GenerationProblem();

  const feasibility =
    analyzeTimetableV2Feasibility(
      problem,
    );

  return NextResponse.json({
    ok:
      true,

    benchmark:
      getLargeSchool560BenchmarkSummary(),

    feasibility,
  });
}

export async function POST() {
  const access =
    await authorize();

  if (!access.ok) {
    return access.response;
  }

  const problem =
    createLargeSchool560GenerationProblem();

  const benchmark =
    getLargeSchool560BenchmarkSummary();

  const feasibility =
    analyzeTimetableV2Feasibility(
      problem,
    );

  if (
    feasibility.status ===
      "PROVABLY_INFEASIBLE" ||
    feasibility.status ===
      "INVALID_PROBLEM"
  ) {
    return NextResponse.json({
      ok:
        false,

      stoppedBeforeSolver:
        true,

      reason:
        "FEASIBILITY_CHECK_FAILED",

      benchmark,

      feasibility,
    });
  }

  const solverRequest =
    buildTimefoldSolveRequestV1(
      problem,
      {
        seed:
          56016040,

        spentLimitSeconds:
          60,
      },
    );

  try {
    const solverResult =
      await solveWithTimefoldV1(
        solverRequest,
      );

    const sessions =
      mapTimefoldV1ResultToGeneratedSessions(
        problem,
        solverResult,
      );

    const validation =
      validateGeneratedTimetableV2(
        problem,
        sessions,
      );

    const teacherSlots =
      new Set<string>();

    const classSlots =
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
        teacherSlots.has(
          teacherKey,
        )
      ) {
        teacherCollisions +=
          1;
      }

      if (
        classSlots.has(
          classKey,
        )
      ) {
        classCollisions +=
          1;
      }

      teacherSlots.add(
        teacherKey,
      );

      classSlots.add(
        classKey,
      );
    }

    const accepted =
      sessions.length ===
        560 &&
      solverResult.hardScore >=
        0 &&
      teacherCollisions ===
        0 &&
      classCollisions ===
        0 &&
      validation.valid &&
      validation.hardViolationCount ===
        0;

    return NextResponse.json({
      ok:
        true,

      benchmark,

      feasibility: {
        status:
          feasibility.status,

        provenContradictions:
          feasibility.summary
            .provenContradictions,

        warnings:
          feasibility.summary
            .warnings,
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
        accepted,

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
    });
  }
  catch (error) {
    if (
      error instanceof
        TimefoldV1Error
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          benchmark,

          feasibility: {
            status:
              feasibility.status,

            provenContradictions:
              feasibility.summary
                .provenContradictions,
          },

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

    throw error;
  }
}