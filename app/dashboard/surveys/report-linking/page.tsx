import { DashboardResourceLinkingPage } from "@/components/resource-links/dashboard-resource-linking-page";

export default function SurveyReportLinkingPage() {
  return (
    <DashboardResourceLinkingPage
      sourceType="CASE_REPORT"
      targetType="SURVEY_ANALYSIS"
      title="ربط التقارير بالاستبيانات"
      subtitle="اختر تقريرًا أو حالة، ثم اربط استبيانًا واحدًا أو أكثر. ستظهر الاستبيانات المرتبطة في معاينة التقرير، وتلحق معه عند الطباعة أو تحميل PDF."
      sourceLabel="التقارير والحالات"
      targetLabel="الاستبيانات"
      targetSingularLabel="استبيان"
      sourceSearchPlaceholder="بحث في التقارير..."
      targetSearchPlaceholder="بحث في الاستبيانات..."
      activeSourceLabel="التقرير النشط"
      selectedTargetsLabel="الاستبيانات المحددة"
      targetCardBadge="تقرير استبيان"
      openTargetLabel="فتح الاستبيان"
      savedLinksTitle="روابط التقارير والاستبيانات"
      savedLinksSubtitle="يعرض التقارير المرتبطة باستبيان أو أكثر، وسيتم إلحاق الاستبيانات في معاينة التقرير وتحميل PDF."
      backHref="/dashboard/surveys"
      backLabel="العودة للاستبيانات"
    />
  );
}