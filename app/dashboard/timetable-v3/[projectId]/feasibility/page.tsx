import {
  TimetableV3FeasibilityWorkspace,
} from "@/components/timetable-v3/feasibility-workspace";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableV3FeasibilityPage({
  params,
}: PageProps) {
  const {
    projectId,
  } = await params;

  return (
    <TimetableV3FeasibilityWorkspace
      projectId={
        projectId
      }
    />
  );
}