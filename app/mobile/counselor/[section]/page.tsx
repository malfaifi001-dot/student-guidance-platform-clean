import { CounselorMobileApp } from "@/components/mobile/counselor-mobile-app";

type MobileCounselorSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function MobileCounselorSectionPage({
  params,
}: MobileCounselorSectionPageProps) {
  const { section } = await params;

  return <CounselorMobileApp initialSection={section} />;
}