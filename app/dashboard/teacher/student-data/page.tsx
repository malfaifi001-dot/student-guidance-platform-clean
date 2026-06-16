import { FeaturePlanningPlaceholderPage } from "@/components/workspace/feature-planning-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function TeacherStudentDataPage() {
  await requireDashboardUser();

  return (
    <FeaturePlanningPlaceholderPage
      eyebrow="مساحة المعلم"
      title="بيانات الطلاب للمعلم"
      description="هذه صفحة تنظيمية محايدة لبيانات الطلاب ضمن مساحة المعلم. الميزة قيد التصميم حتى تحديد الصلاحيات والمتطلبات."
      backHref="/dashboard/teacher"
      backLabel="العودة إلى مساحة المعلم"
    />
  );
}
