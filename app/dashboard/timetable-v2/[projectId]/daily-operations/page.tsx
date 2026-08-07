import {
  notFound,
} from "next/navigation";

import {
  TimetableV2DailyOperationsCenter,
} from "@/components/timetable-v2/daily-operations/daily-operations-center";

import {
  prisma,
} from "@/lib/prisma";

import {
  requireTimetablePageAccess,
} from "@/lib/timetable/timetable-access";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableV2DailyOperationsPage({
  params,
}: PageProps) {
  const access =
    await requireTimetablePageAccess();

  const {
    projectId,
  } =
    await params;

  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id:
          projectId,

        schoolAccountId:
          access.schoolAccountId,
      },

      select: {
        id:
          true,

        status:
          true,

        schedules: {
          where: {
            status:
              "PUBLISHED",
          },

          select: {
            id:
              true,
          },

          take:
            1,
        },
      },
    });

  if (!project) {
    notFound();
  }

  return (
    <main
      className="
        mx-auto
        w-full
        max-w-[1600px]
        p-4
        md:p-6
      "
    >
      <TimetableV2DailyOperationsCenter
        projectId={
          project.id
        }
      />
    </main>
  );
}