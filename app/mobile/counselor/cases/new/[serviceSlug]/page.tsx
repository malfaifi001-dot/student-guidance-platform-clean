import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    serviceSlug: string;
  }>;
};

export default async function OldMobileNewCaseServiceRoute({ params }: PageProps) {
  const { serviceSlug } = await params;

  redirect(`/mobile/counselor/${serviceSlug}/new`);
}