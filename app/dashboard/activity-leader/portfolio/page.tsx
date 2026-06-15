import { WorkspacePlaceholderPage } from "@/components/workspace/workspace-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function Page() {
  await requireDashboardUser();

  return (
    <WorkspacePlaceholderPage
      eyebrow="ريادة النشاط"
      title="ملف إنجاز رائد النشاط"
      description="مساحة مستقبلية لتجميع برامج النشاط، الشواهد، التقارير، والتكليفات المعتمدة في ملف موحد."
      backHref="/dashboard/activity-leader"
      backLabel="العودة إلى لوحة رائد النشاط"
    />
  );
}