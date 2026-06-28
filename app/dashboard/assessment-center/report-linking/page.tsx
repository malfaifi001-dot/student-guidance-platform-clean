import { DashboardResourceLinkingPage } from "@/components/resource-links/dashboard-resource-linking-page";

export default function AssessmentReportLinkingPage() {
  return (
    <DashboardResourceLinkingPage
      sourceType="CASE_REPORT"
      targetType="ASSESSMENT_ANALYSIS"
      title="ربط التقارير بالتحاليل"
      subtitle="اختر تقريرًا أو حالة، ثم اربط تحليلًا واحدًا أو أكثر من مركز التحليل والاختبارات. هذا الربط عام وقابل لإعادة الاستخدام لاحقًا مع الاستبيانات والشهادات وأي مصادر أخرى."
      sourceLabel="التقارير والحالات"
      targetLabel="تحاليل النتائج"
      sourceSearchPlaceholder="بحث في التقارير..."
      targetSearchPlaceholder="بحث في التحاليل..."
      activeSourceLabel="التقرير النشط"
      selectedTargetsLabel="التحاليل المحددة"
      backHref="/dashboard/assessment-center"
      backLabel="العودة لمركز التحليل"
    />
  );
}