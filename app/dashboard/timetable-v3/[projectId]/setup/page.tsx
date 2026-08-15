import {
  TimetableV3ProjectSetupWizard,
} from "@/components/timetable-v3/project-setup-wizard";

type Props = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableV3SetupPage(
  {
    params,
  }: Props,
) {
  const {
    projectId,
  } = await params;

  return (
    <TimetableV3ProjectSetupWizard
      projectId={
        projectId
      }
    />
  );
}