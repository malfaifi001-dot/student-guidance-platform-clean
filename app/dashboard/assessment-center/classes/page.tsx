import {
  AssessmentCenterSectionPage,
  assessmentSectionIcons,
} from "@/components/assessment-center/assessment-center-section-page";

export default function AssessmentClassesPage() {
  return (
    <AssessmentCenterSectionPage
      badge=""
      title="تحليل الصفوف"
      description="راجع الصفوف بعد فتح تحليل."
      icon={assessmentSectionIcons.classes}
      items={[
        {
          title: "مقارنة الصفوف",
          description: "عرض الفروق بين الصفوف.",
        },
        {
          title: "مقارنة الفصول",
          description: "تحديد الفصول التي تحتاج متابعة.",
        },
        {
          title: "أفضل وأضعف فصل",
          description: "إبراز الفصول الأعلى والأقل أداءً.",
        },
        {
          title: "خطة جماعية",
          description: "اقتراح متابعة جماعية عند الحاجة.",
        },
      ]}
    />
  );
}
