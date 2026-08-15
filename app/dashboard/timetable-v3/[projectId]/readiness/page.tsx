import {
  notFound,
} from "next/navigation";

import {
  TimetableV3ReadinessWorkspace,
} from "@/components/timetable-v3/readiness-workspace";

import {
  requireTimetablePageAccess,
} from "@/lib/timetable/timetable-access";

import {
  analyzeTimetableV2Readiness,
} from "@/lib/timetable-v2/readiness-analysis";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableV3ReadinessPage(
  {
    params,
  }: PageProps,
) {
  const access =
    await requireTimetablePageAccess();

  const {
    projectId,
  } = await params;

  try {
    const result =
      await analyzeTimetableV2Readiness(
        projectId,
        access.schoolAccountId,
      );

    return (
      <TimetableV3ReadinessWorkspace
        projectId={
          projectId
        }
        score={
          result.score
        }
        canGenerate={
          result.canGenerate
        }
        issues={JSON.parse(
          JSON.stringify(
            result.issues,
          ),
        )}
      />
    );
  }
  catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "PROJECT_NOT_FOUND"
    ) {
      notFound();
    }

    throw error;
  }
}