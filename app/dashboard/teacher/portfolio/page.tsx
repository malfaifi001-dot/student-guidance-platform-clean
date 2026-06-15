import { FeaturePlanningPlaceholderPage } from "@/components/workspace/feature-planning-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function Page() {
  await requireDashboardUser();

  return (
    <FeaturePlanningPlaceholderPage
      eyebrow="مساحة المعلم"
      title="ملف إنجاز المعلم"
      description="هذه الصفحة مخصصة لاحقًا لملف إنجاز المعلم بعد اعتماد المتطلبات."
      backHref="/dashboard/teacher"
      backLabel="العودة إلى مساحة المعلم"
    />
  );
}