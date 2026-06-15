import { WorkspacePlaceholderPage } from "@/components/workspace/workspace-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function Page() {
  await requireDashboardUser();

  return (
    <WorkspacePlaceholderPage
      eyebrow="مساحة المعلم"
      title="شهاداتي"
      description="مساحة مستقبلية لعرض الشهادات والتكريمات المرتبطة بالمعلم ومشاركاته."
      backHref="/dashboard/teacher"
      backLabel="العودة إلى لوحة المعلم"
    />
  );
}