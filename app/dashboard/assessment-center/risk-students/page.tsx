import {
  AssessmentCenterSectionPage,
  assessmentSectionIcons,
} from "@/components/assessment-center/assessment-center-section-page";

export default function AssessmentRiskStudentsPage() {
  return (
    <AssessmentCenterSectionPage
      badge=""
      title="الطلاب المحتاجون متابعة"
      description="راجع الطلاب بعد فتح تحليل."
      icon={assessmentSectionIcons.riskStudents}
      items={[
        {
          title: "انخفاض النسبة",
          description: "عرض الطلاب منخفضي النتائج.",
        },
        {
          title: "أكثر من مادة",
          description: "تمييز الطلاب المتعثرين في عدة مواد.",
        },
        {
          title: "أولوية المتابعة",
          description: "تحديد من يبدأ أولًا.",
        },
        {
          title: "إنشاء خطة",
          description: "الانتقال إلى خطة متابعة مناسبة.",
        },
      ]}
    />
  );
}
