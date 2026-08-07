import {
  TimetableV2ReviewWorkspace,
} from "@/components/timetable-v2/review/review-workspace";

type Props = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function TimetableV2ReviewPage({
  params,
}: Props) {
  const {
    projectId,
  } =
    await params;

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-[1600px]
        p-4
        md:p-6
      "
    >
      <TimetableV2ReviewWorkspace
        projectId={
          projectId
        }
      />
    </div>
  );
}