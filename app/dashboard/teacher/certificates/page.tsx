import { FeaturePlanningPlaceholderPage } from "@/components/workspace/feature-planning-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function Page() {
  await requireDashboardUser();

  return (
    <FeaturePlanningPlaceholderPage
      eyebrow="مساحة المعلم"
      title="شهادات المعلم"
      description="هذه الصفحة مخصصة لاحقًا للشهادات بعد تحديد طريقة الإصدار والاعتماد والربط."
      backHref="/dashboard/teacher"
      backLabel="العودة إلى مساحة المعلم"
    />
  );
}