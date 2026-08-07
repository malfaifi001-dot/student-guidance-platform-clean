import {
  notFound,
} from "next/navigation";

import {
  TimetableV2AssignmentsWorkspace,
} from "@/components/timetable-v2/assignments-workspace";

import {
  requireTimetablePageAccess,
} from "@/lib/timetable/timetable-access";

import {
  getTimetableV2AssignmentsWorkspace,
} from "@/lib/timetable-v2/assignment-service";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;

  searchParams: Promise<{
    teacherId?: string;
  }>;
};

export default async function TimetableV2AssignmentsPage({
  params,
  searchParams,
}: PageProps) {
  const access =
    await requireTimetablePageAccess();

  const {
    projectId,
  } = await params;

  const {
    teacherId,
  } = await searchParams;

  let data;

  try {
    data =
      await getTimetableV2AssignmentsWorkspace(
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

  const selectedTeacherId =
    teacherId &&
    data.teachers.some(
      (teacher) =>
        teacher.id ===
        teacherId,
    )
      ? teacherId
      : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <TimetableV2AssignmentsWorkspace
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
        teachers={JSON.parse(
          JSON.stringify(
            data.teachers,
          ),
        )}
        classSubjects={JSON.parse(
          JSON.stringify(
            data.classSubjects,
          ),
        )}
        initialAssignments={JSON.parse(
          JSON.stringify(
            data.assignments,
          ),
        )}
        initialSelectedTeacherId={
          selectedTeacherId
        }
      />
    </main>
  );
}