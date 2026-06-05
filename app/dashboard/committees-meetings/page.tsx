import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";

export default function CommitteesMeetingsPage() {
  return (
    <WorkflowServiceHomePage
      serviceSlug="committees-meetings"
      title="اللجان والاجتماعات"
      description="أنشئ محضر اجتماع، أو أكمل مسودة سابقة، أو أصدر تقريرًا لمحضر مكتمل."
      newButtonLabel="إنشاء محضر جديد"
      caseSingularName="محضر"
      casePluralName="محاضر"
      emptyTitle="لا توجد محاضر بعد"
      emptyDescription="ابدأ بإنشاء أول محضر. بعد الحفظ ستظهر المحاضر هنا كبطاقات سهلة."
    />
  );
}
