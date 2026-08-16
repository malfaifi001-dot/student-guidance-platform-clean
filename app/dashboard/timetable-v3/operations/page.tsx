import { TimetableV3OperationsProjectSelector } from "@/components/timetable-v3/operations-project-selector";
import { listTimetableV3Projects } from "@/lib/timetable-v3/project-setup-service";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";

export const dynamic = "force-dynamic";

export default async function TimetableV3OperationsLandingPage() {
  const access = await requireTimetablePageAccess();
  const projects = await listTimetableV3Projects(access.schoolAccountId);

  return <TimetableV3OperationsProjectSelector projects={projects} />;
}
