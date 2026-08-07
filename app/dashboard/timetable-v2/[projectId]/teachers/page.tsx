import {
  notFound,
} from "next/navigation";

import {
  TimetableV2TeachersWorkspace,
} from "@/components/timetable-v2/teachers-workspace";

import {
  requireTimetablePageAccess,
} from "@/lib/timetable/timetable-access";

import {
  getTimetableV2TeachersWorkspace,
} from "@/lib/timetable-v2/teacher-service";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableV2TeachersPage({
  params,
}: PageProps) {
  const access =
    await requireTimetablePageAccess();

  const {
    projectId,
  } = await params;

  let data;

  try {
    data =
      await getTimetableV2TeachersWorkspace(
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
      <TimetableV2TeachersWorkspace
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
        initialTeachers={JSON.parse(
          JSON.stringify(
            data.teachers,
          ),
        )}
      />
    </main>
  );
}