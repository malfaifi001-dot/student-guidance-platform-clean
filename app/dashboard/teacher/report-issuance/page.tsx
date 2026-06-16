import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";

const TEACHER_REPORT_SERVICE_SLUG = "teacher-report-issuance";
const TEACHER_REPORT_BASE_PATH = "/dashboard/teacher/report-issuance";

export default function TeacherReportIssuancePage() {
  return (
    <WorkflowServiceHomePage
      serviceSlug={TEACHER_REPORT_SERVICE_SLUG}
      basePath={TEACHER_REPORT_BASE_PATH}
      title="إصدار تقرير"
      description="خدمة للمعلم لإصدار تقرير عبر نموذج Workflow منشور من الأدمن."
      newButtonLabel="إنشاء تقرير جديد"
      caseSingularName="تقرير"
      casePluralName="تقارير"
      emptyTitle="لا توجد تقارير بعد"
      emptyDescription="ابدأ بإنشاء أول تقرير من نموذج Workflow المنشور. بعد الحفظ سيظهر هنا كسجل قابل للمتابعة."
    />
  );
}
