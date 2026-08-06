import { TimetableSetup } from "@/components/timetable/timetable-setup";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";
import { listTimetableProjects } from "@/lib/timetable/timetable-project-service";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const access = await requireTimetablePageAccess();
  const projects = await listTimetableProjects(access.schoolAccountId);

  return (
    <TimetableSetup
      initialProjects={JSON.parse(JSON.stringify(projects))}
    />
  );
}