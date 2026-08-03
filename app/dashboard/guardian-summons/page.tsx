import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";

export default function GuardianSummonsPage() {
  return (
    <WorkflowServiceHomePage
      serviceSlug="guardian-summons"
      title="إشعار ولي الأمر"
      description="أنشئ إشعارات أولياء الأمور، واستكمل المسودات، وتابع الحالات المرسلة، وأصدر الخطاب الرسمي لكل حالة."
      newButtonLabel="إنشاء إشعار جديد"
      caseSingularName="إشعار"
      casePluralName="إشعارات"
      emptyTitle="لا توجد إشعارات بعد"
      emptyDescription="ابدأ بإنشاء أول إشعار لولي أمر. بعد الحفظ سيظهر هنا كسجل حالة رسمي."
    />
  );
}
