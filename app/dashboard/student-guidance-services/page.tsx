import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";

export default function StudentGuidanceServicesPage() {
  return (
    <WorkflowServiceHomePage
      serviceSlug="student-guidance-services"
      title="الخدمات الإرشادية المقدمة للطلاب"
      description="سجّل الخدمات الإرشادية المقدمة للطلاب المقدمة للطلاب، واستكمل المسودات، وأصدر التقارير."
      newButtonLabel="إنشاء خدمة جديدة"
      caseSingularName="خدمة"
      casePluralName="خدمات"
      emptyTitle="لا توجد خدمات بعد"
      emptyDescription="ابدأ بتسجيل أول خدمة توجيهية. بعد الحفظ ستظهر هنا كبطاقة سهلة."
    />
  );
}
