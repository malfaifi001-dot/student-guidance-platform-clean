import {
  AssessmentCenterSectionPage,
  assessmentSectionIcons,
} from "@/components/assessment-center/assessment-center-section-page";

export default function AssessmentRecommendationsPage() {
  return (
    <AssessmentCenterSectionPage
      badge="Smart Recommendations"
      title="التوصيات العلاجية"
      description="توصيات إرشادية وعلاجية مبنية على نتائج الطلاب والمواد والفصول."
      icon={assessmentSectionIcons.recommendations}
      items={[
        {
          title: "توصيات للطالب",
          description: "اقتراح متابعة فردية أو إشراك ولي الأمر حسب مستوى الطالب.",
        },
        {
          title: "توصيات للمادة",
          description: "اقتراح برنامج علاجي لمادة يظهر فيها ضعف عام.",
        },
        {
          title: "توصيات للفصل",
          description: "اقتراح تدخل جماعي إذا ظهر ضعف في فصل كامل.",
        },
        {
          title: "ربط بالتقارير",
          description: "تحويل التوصيات إلى تقارير PDF أو Word لاحقًا.",
        },
      ]}
    />
  );
}