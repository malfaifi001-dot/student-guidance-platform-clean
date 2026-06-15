import { FeaturePlanningPlaceholderPage } from "@/components/workspace/feature-planning-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function Page() {
  await requireDashboardUser();

  return (
    <FeaturePlanningPlaceholderPage
      eyebrow="التوجيه الطلابي"
      title="ملف إنجاز الموجه"
      description="هذه الصفحة مخصصة لاحقًا لملف إنجاز الموجه بعد اعتماد المتطلبات."
      backHref="/dashboard"
      backLabel="العودة إلى لوحة الموجه"
    />
  );
}