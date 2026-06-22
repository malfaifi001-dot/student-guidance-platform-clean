import {
  AssessmentCenterSectionPage,
  assessmentSectionIcons,
} from "@/components/assessment-center/assessment-center-section-page";

export default function AssessmentRecommendationsPage() {
  return (
    <AssessmentCenterSectionPage
      badge=""
      title="التوصيات"
      description="راجع التوصيات بعد فتح تحليل."
      icon={assessmentSectionIcons.recommendations}
      items={[
        {
          title: "توصيات للطالب",
          description: "اقتراح متابعة فردية.",
        },
        {
          title: "توصيات للمادة",
          description: "اقتراح خطة للمادة.",
        },
        {
          title: "توصيات للفصل",
          description: "اقتراح متابعة جماعية.",
        },
        {
          title: "ربط بالتقارير",
          description: "استخدام التوصيات داخل التقارير.",
        },
      ]}
    />
  );
}
