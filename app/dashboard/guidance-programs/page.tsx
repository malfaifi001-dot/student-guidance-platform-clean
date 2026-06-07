import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";

export default function GuidanceProgramsPage() {
  return (
    <WorkflowServiceHomePage
      serviceSlug="guidance-programs"
      title="البرامج الإرشادية"
      description="أنشئ برنامجًا إرشاديًا، أو أكمل مسودة، أو أصدر تقريرًا لبرنامج مكتمل."
      newButtonLabel="إنشاء برنامج جديد"
      caseSingularName="برنامج"
      casePluralName="برامج"
      emptyTitle="لا توجد برامج بعد"
      emptyDescription="ابدأ بإنشاء أول برنامج إرشادي. بعد الحفظ سيظهر هنا كبطاقة سهلة."
    />
  );
}
