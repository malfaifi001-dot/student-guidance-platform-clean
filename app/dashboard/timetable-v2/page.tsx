import {
  TimetableV2ProjectListWorkspace,
} from "@/components/timetable-v2/project-list-workspace";

import {
  requireTimetablePageAccess,
} from "@/lib/timetable/timetable-access";

import {
  getTimetableV2ProjectList,
} from "@/lib/timetable-v2/project-list-service";

export const dynamic =
  "force-dynamic";

export default async function TimetableV2ProjectsPage() {
  const access =
    await requireTimetablePageAccess();

  const projects =
    await getTimetableV2ProjectList(
      access.schoolAccountId,
    );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <TimetableV2ProjectListWorkspace
        projects={JSON.parse(
          JSON.stringify(
            projects,
          ),
        )}
      />
    </main>
  );
}