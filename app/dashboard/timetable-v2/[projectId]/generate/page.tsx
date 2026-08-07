import {
  notFound,
} from "next/navigation";

import {
  TimetableV2GenerationWorkspace,
} from "@/components/timetable-v2/generation/generation-workspace";

import {
  requireTimetablePageAccess,
} from "@/lib/timetable/timetable-access";

import {
  getTimetableV2GenerationWorkspace,
} from "@/lib/timetable-v2/generation/generation-service";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableV2GeneratePage({
  params,
}: PageProps) {
  const access =
    await requireTimetablePageAccess();

  const {
    projectId,
  } =
    await params;

  let workspace;

  try {
    workspace =
      await getTimetableV2GenerationWorkspace(
        projectId,
        access.schoolAccountId,
      );
  }
  catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "PROJECT_NOT_FOUND"
    ) {
      notFound();
    }

    throw error;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <TimetableV2GenerationWorkspace
        workspace={JSON.parse(
          JSON.stringify(
            workspace,
          ),
        )}
      />
    </main>
  );
}