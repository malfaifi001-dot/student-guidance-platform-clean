import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";
import { ensureSpecialReportService } from "@/lib/special-report/runtime-builder";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function SpecialReportServicePage() {
  await ensureSpecialReportService();
  await requireServiceAccessForCurrentUser("special-report");

  return (
    <WorkflowServiceHomePage
      serviceSlug="special-report"
      basePath="/dashboard/teacher/special-report"
      title="تقرير مخصص"
      description="أنشئ تقريرًا مرنًا باختيار الحقول التي تحتاجها ثم أكمل التقرير من خلال النموذج المعتمد."
      newButtonLabel="إنشاء تقرير جديد"
      caseSingularName="تقرير"
      casePluralName="التقارير"
      emptyTitle="لا توجد تقارير مخصصة بعد"
      emptyDescription="ابدأ بإنشاء تقرير جديد من خلال اختيار الحقول المناسبة."
      reportPrepareBasePath="/dashboard/report-2/cases"
      hideWorkflowStatus
      specialReportLinking
    />
  );
}
