import { notFound } from "next/navigation";
import { TimetableV3SchedulePreviewWorkspace } from "@/components/timetable-v3/schedule-preview-workspace";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";
import { getTimetableV3PreviewData } from "@/lib/timetable-v3/schedule-service";

export const dynamic = "force-dynamic";

export default async function TimetableV3PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ scheduleId?: string | string[] }>;
}) {
  const access = await requireTimetablePageAccess();
  const { projectId } = await params;
  const query = await searchParams;
  const scheduleId = typeof query.scheduleId === "string" ? query.scheduleId : undefined;

  let workspace;
  try {
    workspace = await getTimetableV3PreviewData(projectId, access.schoolAccountId, scheduleId);
  } catch (error) {
    if (error instanceof Error && ["PROJECT_NOT_FOUND", "SCHEDULE_NOT_FOUND"].includes(error.message)) notFound();
    throw error;
  }

  return <TimetableV3SchedulePreviewWorkspace workspace={workspace} />;
}
