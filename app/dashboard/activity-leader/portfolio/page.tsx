import { FeaturePlanningPlaceholderPage } from "@/components/workspace/feature-planning-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function Page() {
  await requireDashboardUser();

  return (
    <FeaturePlanningPlaceholderPage
      eyebrow="ريادة النشاط"
      title="ملف إنجاز رائد النشاط"
      description="هذه الصفحة مخصصة لاحقًا لملف إنجاز رائد النشاط بعد اعتماد المتطلبات."
      backHref="/dashboard/activity-leader"
      backLabel="العودة إلى لوحة رائد النشاط"
    />
  );
}