import {
  AssessmentCenterSectionPage,
  assessmentSectionIcons,
} from "@/components/assessment-center/assessment-center-section-page";

export default function AssessmentSubjectsPage() {
  return (
    <AssessmentCenterSectionPage
      badge=""
      title="تحليل المواد"
      description="راجع المواد بعد فتح تحليل."
      icon={assessmentSectionIcons.subjects}
      items={[
        {
          title: "متوسط كل مادة",
          description: "عرض متوسط المادة.",
        },
        {
          title: "أضعف المواد",
          description: "تحديد المواد الأكثر حاجة للمتابعة.",
        },
        {
          title: "الطلاب المحتاجون متابعة",
          description: "عرض الطلاب بحسب المادة.",
        },
        {
          title: "خطة مادة",
          description: "اقتراح متابعة للمادة.",
        },
      ]}
    />
  );
}
