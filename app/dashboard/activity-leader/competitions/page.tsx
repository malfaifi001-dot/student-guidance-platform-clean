import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";
import { STUDENT_ACTIVITY_COMPETITIONS_SERVICE } from "@/lib/activity-competitions/activity-competitions-service";

export default function StudentActivityCompetitionsPage() {
  return (
    <WorkflowServiceHomePage
      serviceSlug={STUDENT_ACTIVITY_COMPETITIONS_SERVICE.slug}
      title={STUDENT_ACTIVITY_COMPETITIONS_SERVICE.title}
      description={STUDENT_ACTIVITY_COMPETITIONS_SERVICE.description}
      basePath={STUDENT_ACTIVITY_COMPETITIONS_SERVICE.href}
      newButtonLabel="إنشاء مسابقة"
      caseSingularName="مسابقة"
      casePluralName="المسابقات"
      emptyTitle="لا توجد مسابقات بعد"
      emptyDescription="ابدأ بإنشاء أول مسابقة من نموذج سير العمل المنشور."
    />
  );
}
