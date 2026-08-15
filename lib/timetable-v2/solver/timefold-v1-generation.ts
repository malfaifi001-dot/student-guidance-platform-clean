import type {
  GenerationProblem,
} from "../generation/generation-domain";

import {
  validateGeneratedTimetableV2,
} from "../generation/generation-validator";

import {
  analyzeTimetableV2Feasibility,
} from "../feasibility";

import {
  buildTimefoldSolveRequestV1,
} from "./timefold-v1-adapter";

import {
  solveWithTimefoldV1,
} from "./timefold-v1-client";

import {
  mapTimefoldV1ResultToGeneratedSessions,
} from "./timefold-v1-result-mapper";

export const TIMEFOLD_V1_ENGINE_VERSION =
  "timefold-v1";

export type TimefoldV1GenerationResult =
  Awaited<
    ReturnType<
      typeof generateTimetableV2WithTimefold
    >
  >;

export async function generateTimetableV2WithTimefold(
  problem: GenerationProblem,
  input: {
    seed: number;
    spentLimitSeconds?: number;
  },
) {
  const startedAt =
    Date.now();

  /*
   * Phase 1:
   * Fast mathematical pre-flight.
   *
   * Important:
   * NO_PROVEN_CONTRADICTION does not prove feasibility.
   * PROVABLY_INFEASIBLE does prove that the solver should
   * not be started.
   */
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
    const validation = {
      valid:
        false,

      hardViolationCount:
        feasibility.summary
          .provenContradictions,

      issues:
        feasibility.issues
          .filter(
            (issue) =>
              issue.severity ===
                "ERROR" &&
              issue.proven,
          )
          .map(
            (issue) => ({
              code:
                issue.code,

              message:
                issue.message,

              entityId:
                issue.entityId,
            }),
          ),
    };

    return {
      success:
        false,

      attemptCount:
        0,

      completedAttempts:
        0,

      seed:
        input.seed,

      durationMs:
        Date.now() -
        startedAt,

      diagnostics: [
        {
          code:
            "FEASIBILITY_PRECHECK_FAILED",

          status:
            feasibility.status,

          summary:
            feasibility.summary,

          issues:
            feasibility.issues.filter(
              (issue) =>
                issue.severity ===
                  "ERROR" &&
                issue.proven,
            ),
        },
      ],

      best: {
        score:
          -1_000_000_000,

        completeness:
          0,

        softPenalty:
          0,

        scoreBreakdown: {
          engine:
            TIMEFOLD_V1_ENGINE_VERSION,

          phase:
            "FEASIBILITY",

          feasibilityStatus:
            feasibility.status,

          provenContradictions:
            feasibility.summary
              .provenContradictions,
        },

        validation,

        sessions:
          [],
      },
    };
  }

  /*
   * Phase 2:
   * Build the official versioned Timefold contract.
   */
  const solverRequest =
    buildTimefoldSolveRequestV1(
      problem,
      {
        seed:
          input.seed,

        spentLimitSeconds:
          input.spentLimitSeconds ??
          60,
      },
    );

  /*
   * Phase 3:
   * Timefold is the only Timetable V2 solver.
   */
  const solverResult =
    await solveWithTimefoldV1(
      solverRequest,
    );

  /*
   * Phase 4:
   * Convert solver blocks back into Teachix's canonical
   * GeneratedSession[] format.
   */
  const sessions =
    mapTimefoldV1ResultToGeneratedSessions(
      problem,
      solverResult,
    );

  /*
   * Phase 5:
   * Teachix remains the final authority.
   *
   * We never save a solution merely because Timefold says
   * hardScore = 0.
   */
  const validation =
    validateGeneratedTimetableV2(
      problem,
      sessions,
    );

  const requiredSessions =
    problem.assignments.reduce(
      (
        total,
        assignment,
      ) =>
        total +
        assignment.assignedLessons,
      0,
    );

  const solvedSessions =
    sessions.length;

  const completeness =
    requiredSessions > 0
      ? Math.min(
          100,
          (
            solvedSessions /
            requiredSessions
          ) *
            100,
        )
      : 100;

  /*
   * TimetableSchedule.score is numeric in the existing
   * persistence contract.
   *
   * Saved solutions must have 0 HARD violations, therefore
   * softScore is sufficient as the persisted ranking score.
   */
  const numericScore =
    solverResult.softScore;

  const softPenalty =
    Math.max(
      0,
      -solverResult.softScore,
    );

  const accepted =
    solverResult.hardScore >=
      0 &&
    solverResult.solvedSessions ===
      solverResult.requiredSessions &&
    solvedSessions ===
      requiredSessions &&
    validation.valid &&
    validation.hardViolationCount ===
      0;

  return {
    success:
      accepted,

    attemptCount:
      1,

    completedAttempts:
      1,

    seed:
      input.seed,

    durationMs:
      Date.now() -
      startedAt,

    diagnostics: [
      {
        code:
          "TIMEFOLD_V1_RESULT",

        solverScore:
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

        solverDurationMs:
          solverResult.durationMs,

        solverDiagnostics:
          solverResult.diagnostics,

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
      },
    ],

    best: {
      score:
        numericScore,

      completeness,

      softPenalty,

      scoreBreakdown: {
        engine:
          TIMEFOLD_V1_ENGINE_VERSION,

        hardScore:
          solverResult.hardScore,

        softScore:
          solverResult.softScore,

        solverScore:
          solverResult.score,

        requiredSessions,

        solvedSessions,

        feasibilityStatus:
          feasibility.status,
      },

      validation,

      sessions,
    },
  };
}