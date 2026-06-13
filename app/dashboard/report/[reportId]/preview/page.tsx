import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ reportId: string }>;
};

export default async function ReportPreviewRedirect(props: Props) {
  const { reportId } = await props.params;
  redirect(`/dashboard/reports/${reportId}/preview`);
}
