import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";

export default function GuardianSummonsPage() {
  return (
    <WorkflowServiceHomePage
      serviceSlug="guardian-summons"
      title="استدعاء ولي أمر"
      description="أنشئ استدعاءات أولياء الأمور، واستكمل المسودات، وتابع الحالات المرسلة، وأصدر الخطاب الرسمي لكل حالة."
      newButtonLabel="إنشاء استدعاء جديد"
      caseSingularName="استدعاء"
      casePluralName="استدعاءات"
      emptyTitle="لا توجد استدعاءات بعد"
      emptyDescription="ابدأ بإنشاء أول استدعاء لولي أمر. بعد الحفظ سيظهر هنا كسجل حالة رسمي."
    />
  );
}
