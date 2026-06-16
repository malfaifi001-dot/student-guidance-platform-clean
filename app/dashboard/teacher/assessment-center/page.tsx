import { FeaturePlanningPlaceholderPage } from "@/components/workspace/feature-planning-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function TeacherAssessmentCenterPage() {
  await requireDashboardUser();

  return (
    <FeaturePlanningPlaceholderPage
      eyebrow="مساحة المعلم"
      title="مركز تحليل النتائج للمعلم"
      description="هذه صفحة تنظيمية محايدة للتحليل والمؤشرات ضمن مساحة المعلم. الميزة قيد التصميم حتى اعتماد المتطلبات التفصيلية."
      backHref="/dashboard/teacher"
      backLabel="العودة إلى مساحة المعلم"
    />
  );
}
