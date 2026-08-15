import {
  notFound,
} from "next/navigation";

import {
  TimetableV3ConstraintsWorkspace,
} from "@/components/timetable-v3/constraints-workspace";

import {
  requireTimetablePageAccess,
} from "@/lib/timetable/timetable-access";

import {
  getTimetableV2ConstraintsWorkspace,
} from "@/lib/timetable-v2/constraint-service";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type DayItem = {
  id: string;
  label: string;
  order: number;
};

type PeriodItem = {
  id: string;
  label: string;
  order: number;
  isBreak: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

export default async function TimetableV3ConstraintsPage(
  {
    params,
  }: PageProps,
) {
  const access =
    await requireTimetablePageAccess();

  const {
    projectId,
  } = await params;

  let data;

  try {
    data =
      await getTimetableV2ConstraintsWorkspace(
        projectId,
        access.schoolAccountId,
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

  const days =
    Array.isArray(
      data.project.daysJson,
    )
      ? (
          data.project
            .daysJson as unknown as DayItem[]
        )
      : [];

  const periods =
    Array.isArray(
      data.project.periodsJson,
    )
      ? (
          data.project
            .periodsJson as unknown as PeriodItem[]
        )
      : [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <TimetableV3ConstraintsWorkspace
        project={{
          id:
            data.project.id,

          name:
            data.project.name,

          academicYear:
            data.project.academicYear,

          semester:
            data.project.semester,
        }}
        days={JSON.parse(
          JSON.stringify(
            days,
          ),
        )}
        periods={JSON.parse(
          JSON.stringify(
            periods,
          ),
        )}
        teachers={JSON.parse(
          JSON.stringify(
            data.teachers,
          ),
        )}
        subjects={JSON.parse(
          JSON.stringify(
            data.subjects,
          ),
        )}
        classes={JSON.parse(
          JSON.stringify(
            data.classes,
          ),
        )}
        initialConstraints={JSON.parse(
          JSON.stringify(
            data.constraints,
          ),
        )}
      />
    </main>
  );
}