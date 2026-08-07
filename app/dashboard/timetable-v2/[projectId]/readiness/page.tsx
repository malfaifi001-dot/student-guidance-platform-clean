import {
  notFound,
} from "next/navigation";

import {
  TimetableV2ReadinessWorkspace,
} from "@/components/timetable-v2/readiness-workspace";

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

export default async function TimetableV2ReadinessPage({
  params,
}: PageProps) {
  const access =
    await requireTimetablePageAccess();

  const {
    projectId,
  } = await params;

  let result;

  try {
    result =
      await analyzeTimetableV2Readiness(
        projectId,
        access.schoolAccountId,
      );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "PROJECT_NOT_FOUND"
    ) {
      notFound();
    }

    throw error;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <TimetableV2ReadinessWorkspace
        project={{
          id:
            result.project.id,

          name:
            result.project.name,

          academicYear:
            result.project.academicYear,

          semester:
            result.project.semester,
        }}
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
        summary={
          result.summary
        }
      />
    </main>
  );
}