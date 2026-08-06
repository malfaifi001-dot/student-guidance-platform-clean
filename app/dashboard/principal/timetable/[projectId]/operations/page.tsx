import { notFound } from "next/navigation";

import { TimetableDailyOperationsCenter } from "@/components/timetable/timetable-daily-operations-center";
import { TimetableIdentityShell } from "@/components/timetable/timetable-identity-shell";
import { prisma } from "@/lib/prisma";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableOperationsPage({
  params,
}: PageProps) {
  const access =
    await requireTimetablePageAccess();

  const { projectId } = await params;

  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id: projectId,
        schoolAccountId:
          access.schoolAccountId,
      },
      select: {
        id: true,
      },
    });

  if (!project) {
    notFound();
  }

  return (
    <TimetableIdentityShell>
      <TimetableDailyOperationsCenter
        projectId={project.id}
      />
    </TimetableIdentityShell>
  );
}