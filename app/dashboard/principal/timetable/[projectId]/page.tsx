import { notFound } from "next/navigation";

import { TimetableDataEditor } from "@/components/timetable/timetable-data-editor";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";
import { getTimetableProjectData } from "@/lib/timetable/timetable-data-service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableProjectPage({
  params,
}: PageProps) {
  const access = await requireTimetablePageAccess();
  const { projectId } = await params;

  const project = await getTimetableProjectData(
    projectId,
    access.schoolAccountId,
  );

  if (!project) {
    notFound();
  }

  return (
    <TimetableDataEditor
      initialProject={JSON.parse(JSON.stringify(project))}
    />
  );
}