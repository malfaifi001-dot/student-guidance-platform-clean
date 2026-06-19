import { CounselorMobileApp } from "@/components/mobile/counselor-mobile-app";

type MobileCounselorActionPageProps = {
  params: Promise<{
    section: string;
    action: string;
  }>;
};

export default async function MobileCounselorActionPage({
  params,
}: MobileCounselorActionPageProps) {
  const { section, action } = await params;

  return <CounselorMobileApp initialSection={section} initialAction={action} />;
}