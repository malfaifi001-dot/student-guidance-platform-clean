import {
  TimetableV2ApprovalWorkspace,
} from "@/components/timetable-v2/approval/approval-workspace";

type Props = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableV2ApprovalPage({
  params,
}: Props) {
  const {
    projectId,
  } =
    await params;

  return (
    <main
      className="
        mx-auto
        w-full
        max-w-[1500px]
        p-4
        md:p-6
      "
    >
      <TimetableV2ApprovalWorkspace
        projectId={
          projectId
        }
      />
    </main>
  );
}