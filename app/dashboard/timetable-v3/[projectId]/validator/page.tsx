import { notFound } from "next/navigation";
import { TimetableV3ValidatorWorkspace } from "@/components/timetable-v3/validator-workspace";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";
import { validateTimetableV3Schedule } from "@/lib/timetable-v3/schedule-service";

export const dynamic = "force-dynamic";

export default async function TimetableV3ValidatorPage({
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

  let result;
  try {
    result = await validateTimetableV3Schedule(projectId, access.schoolAccountId, scheduleId);
  } catch (error) {
    if (error instanceof Error && ["PROJECT_NOT_FOUND", "SCHEDULE_NOT_FOUND"].includes(error.message)) notFound();
    throw error;
  }

  return <TimetableV3ValidatorWorkspace projectId={projectId} result={result} />;
}
