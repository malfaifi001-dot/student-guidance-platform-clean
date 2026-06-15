import { WorkspacePlaceholderPage } from "@/components/workspace/workspace-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function Page() {
  await requireDashboardUser();

  return (
    <WorkspacePlaceholderPage
      eyebrow="التوجيه الطلابي"
      title="ملف الإنجاز"
      description="مساحة مستقبلية لتجميع أعمال الموجه الطلابي، التقارير، الشواهد، والإنجازات في ملف موحد."
      backHref="/dashboard"
      backLabel="العودة إلى لوحة الموجه"
    />
  );
}