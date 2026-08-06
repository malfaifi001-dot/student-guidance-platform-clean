import { notFound } from "next/navigation";

import { TimetablePrintView } from "@/components/timetable/timetable-print-view";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";
import { getTimetablePrintData } from "@/lib/timetable/timetable-print-service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams: Promise<{
    mode?: string;
    id?: string;
    print?: string;
  }>;
};

export default async function TimetablePrintPage({
  params,
  searchParams,
}: PageProps) {
  const access = await requireTimetablePageAccess();
  const { projectId } = await params;
  const query = await searchParams;

  const project = await getTimetablePrintData(
    projectId,
    access.schoolAccountId,
  );

  if (!project) {
    notFound();
  }

  const mode =
    query.mode === "teacher"
      ? "teacher"
      : "class";

  const selectedId = String(query.id || "");

  return (
    <TimetablePrintView
      project={project}
      mode={mode}
      selectedId={selectedId}
      shouldPrint={query.print === "1"}
    />
  );
}