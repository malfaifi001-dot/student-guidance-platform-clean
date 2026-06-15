import { TeacherPlaceholderPage } from "@/components/workspace/teacher-placeholder-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function Page() {
  await requireDashboardUser();

  return (
    <TeacherPlaceholderPage
      title="شواهدي"
      description="مساحة مبدئية لرفع وتنظيم الشواهد الخاصة بالمعلم."
    />
  );
}