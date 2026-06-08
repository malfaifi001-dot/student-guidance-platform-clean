import {
  AssessmentCenterSectionPage,
  assessmentSectionIcons,
} from "@/components/assessment-center/assessment-center-section-page";

export default function AssessmentSubjectsPage() {
  return (
    <AssessmentCenterSectionPage
      badge="Subject Analytics"
      title="تحليل المواد"
      description="تحليل أداء الطلاب حسب المواد الدراسية واكتشاف المواد التي تحتاج تدخلًا علاجيًا."
      icon={assessmentSectionIcons.subjects}
      items={[
        {
          title: "متوسط كل مادة",
          description: "عرض متوسط المدرسة والفصول لكل مادة بعد توفر بيانات التحليل.",
        },
        {
          title: "أضعف المواد",
          description: "ترتيب المواد من الأضعف إلى الأقوى حسب نسبة التعثر أو المتوسط.",
        },
        {
          title: "الطلاب المتعثرون في المادة",
          description: "عرض الطلاب الذين يحتاجون متابعة في مادة محددة.",
        },
        {
          title: "توصية علاجية للمادة",
          description: "اقتراح تدخلات إرشادية أو علاجية مرتبطة بالمادة.",
        },
      ]}
    />
  );
}