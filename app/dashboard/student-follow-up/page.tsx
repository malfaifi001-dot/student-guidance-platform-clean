import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";

export default function StudentFollowUpPage() {
  return (
    <WorkflowServiceHomePage
      serviceSlug="student-follow-up"
      title="متابعة الطلاب"
      description="تابع الحالات الطلابية، واستكمل المسودات، وأصدر تقارير للحالات المرسلة."
      newButtonLabel="إنشاء متابعة جديدة"
      caseSingularName="متابعة"
      casePluralName="متابعات"
      emptyTitle="لا توجد متابعات بعد"
      emptyDescription="ابدأ بإنشاء أول متابعة. بعد الحفظ ستظهر هنا كبطاقة سهلة."
    />
  );
}
