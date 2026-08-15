import { notFound } from "next/navigation";
import { TimetableV3VersionsWorkspace } from "@/components/timetable-v3/versions-workspace";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";
import { getTimetableV3Versions } from "@/lib/timetable-v3/schedule-service";

export const dynamic = "force-dynamic";

export default async function TimetableV3VersionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const access = await requireTimetablePageAccess();
  const { projectId } = await params;
  let workspace;
  try {
    workspace = await getTimetableV3Versions(projectId, access.schoolAccountId);
  } catch (error) {
    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") notFound();
    throw error;
  }

  return <TimetableV3VersionsWorkspace workspace={workspace} />;
}
