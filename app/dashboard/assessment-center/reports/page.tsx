import {
  AssessmentCenterSectionPage,
  assessmentSectionIcons,
} from "@/components/assessment-center/assessment-center-section-page";

export default function AssessmentReportsPage() {
  return (
    <AssessmentCenterSectionPage
      badge=""
      title="التقارير"
      description="صدّر التقارير بعد فتح تحليل."
      icon={assessmentSectionIcons.reports}
      items={[
        {
          title: "تصدير Excel",
          description: "تحميل بيانات التحليل.",
        },
        {
          title: "تقرير PDF",
          description: "تقرير مختصر جاهز للطباعة.",
        },
        {
          title: "تقرير ولي الأمر",
          description: "عرض مختصر لنتيجة الطالب.",
        },
        {
          title: "تقرير المتابعة",
          description: "تقرير لخطة العلاج أو الدعم.",
        },
      ]}
    />
  );
}
