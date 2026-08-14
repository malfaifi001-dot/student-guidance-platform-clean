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
  analyzeTimetableV2Feasibility,
} from "@/lib/timetable-v2/feasibility";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(
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

    const report =
      analyzeTimetableV2Feasibility(
        problem,
      );

    return NextResponse.json({
      ok:
        true,

      testOnly:
        true,

      fingerprint,

      report,
    });
  }
  catch (error) {
    console.error(
      "TIMETABLE_V2_FEASIBILITY_ANALYSIS_FAILED",
      {
        projectId,
        error,
      },
    );

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error instanceof Error
            ? error.message
            : "TIMETABLE_V2_FEASIBILITY_ANALYSIS_FAILED",
      },
      {
        status:
          500,
      },
    );
  }
}