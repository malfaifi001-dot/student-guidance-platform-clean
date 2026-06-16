import { FeaturePlanningPlaceholderPage } from "@/components/workspace/feature-planning-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function TeacherSurveysPage() {
  await requireDashboardUser();

  return (
    <FeaturePlanningPlaceholderPage
      eyebrow="مساحة المعلم"
      title="استبيانات المعلم"
      description="هذه صفحة تنظيمية محايدة للاستبيانات الخاصة بالمعلم. الميزة قيد التصميم حتى اعتماد المتطلبات التفصيلية."
      backHref="/dashboard/teacher"
      backLabel="العودة إلى مساحة المعلم"
    />
  );
}
