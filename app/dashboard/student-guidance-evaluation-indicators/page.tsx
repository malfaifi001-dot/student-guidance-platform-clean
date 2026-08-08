import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";

export default function StudentGuidanceEvaluationIndicatorsPage() {
  return (
    <WorkflowServiceHomePage
      serviceSlug="student-guidance-evaluation-indicators"
      title="مؤشرات التوجيه الطلابي للتقويم المدرسي والتقويم الخارجي"
      description="إدارة مؤشرات التوجيه الطلابي المرتبطة بالتقويم المدرسي والتقويم الخارجي وتوثيقها عبر نماذج Workflow."
      newButtonLabel="توثيق مؤشر جديد"
      caseSingularName="مؤشر"
      casePluralName="مؤشرات"
      emptyTitle="لا توجد مؤشرات بعد"
      emptyDescription="ابدأ بتوثيق أول مؤشر للتقويم المدرسي أو التقويم الخارجي. بعد الحفظ سيظهر هنا كبطاقة سهلة."
    />
  );
}
