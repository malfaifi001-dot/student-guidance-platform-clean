import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";

export default function FamilySchoolCommunicationPage() {
  return (
    <WorkflowServiceHomePage
      serviceSlug="family-school-communication"
      title="التواصل بين الأسرة والمدرسة"
      description="وثّق التواصل مع ولي الأمر، واستكمل المسودات، وأصدر التقارير عند الحاجة."
      newButtonLabel="إنشاء تواصل جديد"
      caseSingularName="تواصل"
      casePluralName="تواصلات"
      emptyTitle="لا توجد تواصلات بعد"
      emptyDescription="ابدأ بتوثيق أول تواصل. بعد الحفظ سيظهر هنا كبطاقة سهلة."
    />
  );
}
