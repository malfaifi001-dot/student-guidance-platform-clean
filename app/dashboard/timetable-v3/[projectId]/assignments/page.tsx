import {
  TimetableV3AssignmentsWorkspace,
} from "@/components/timetable-v3/assignments-workspace";

type Props = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableV3AssignmentsPage(
  {
    params,
  }: Props,
) {
  const {
    projectId,
  } = await params;

  return (
    <TimetableV3AssignmentsWorkspace
      projectId={
        projectId
      }
    />
  );
}