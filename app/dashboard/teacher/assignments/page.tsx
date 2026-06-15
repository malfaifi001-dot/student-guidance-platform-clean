import { TeacherPlaceholderPage } from "@/components/workspace/teacher-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function Page() {
  await requireDashboardUser();

  return (
    <TeacherPlaceholderPage
      title="تكليفاتي"
      description="متابعة التكليفات المرسلة للمعلم وتنظيم حالاتها قبل ربطها لاحقًا بالنظام الحقيقي."
    />
  );
}