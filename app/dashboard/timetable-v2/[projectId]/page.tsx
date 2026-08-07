import {
  notFound,
} from "next/navigation";

import {
  TimetableV2ProjectHome,
} from "@/components/timetable-v2/project-home";

import {
  requireTimetablePageAccess,
} from "@/lib/timetable/timetable-access";

import {
  getTimetableV2ProjectSummary,
} from "@/lib/timetable-v2/project-persistence";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableV2ProjectPage({
  params,
}: PageProps) {
  const access =
    await requireTimetablePageAccess();

  const {
    projectId,
  } = await params;

  const project =
    await getTimetableV2ProjectSummary(
      projectId,
      access.schoolAccountId,
    );

  if (!project) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <TimetableV2ProjectHome
        project={JSON.parse(
          JSON.stringify(
            project,
          ),
        )}
      />
    </main>
  );
}