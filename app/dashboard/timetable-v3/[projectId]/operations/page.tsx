import { TimetableV3DailyOperationsWorkspace } from "@/components/timetable-v3/daily-operations/daily-operations-workspace";

export default async function TimetableV3OperationsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <TimetableV3DailyOperationsWorkspace projectId={projectId} />;
}
