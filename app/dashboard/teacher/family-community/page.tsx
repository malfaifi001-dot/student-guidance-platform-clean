import { TeacherPlaceholderPage } from "@/components/workspace/teacher-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function Page() {
  await requireDashboardUser();

  return (
    <TeacherPlaceholderPage
      title="الأسرة والمجتمع"
      description="خدمة Workflow تجريبية للمعلم، هدفها اختبار طريقة عرض خدمات المعلم داخل مساحة عمل مستقلة."
    />
  );
}