import {
  TimetableV3TimefoldWorkspace,
} from "@/components/timetable-v3/timefold-workspace";
import { notFound } from "next/navigation";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";
import { getTimetableV3Versions } from "@/lib/timetable-v3/schedule-service";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableV3TimefoldPage({
  params,
}: PageProps) {
  const {
    projectId,
  } = await params;

  const access = await requireTimetablePageAccess();
  let versionsWorkspace;
  try {
    versionsWorkspace = await getTimetableV3Versions(projectId, access.schoolAccountId);
  } catch (error) {
    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") notFound();
    throw error;
  }

  return (
    <TimetableV3TimefoldWorkspace
      projectId={
        projectId
      }
      savedSchedule={versionsWorkspace.current}
      initialVersions={versionsWorkspace.versions}
    />
  );
}
