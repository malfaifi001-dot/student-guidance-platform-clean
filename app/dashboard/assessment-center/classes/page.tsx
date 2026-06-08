import {
  AssessmentCenterSectionPage,
  assessmentSectionIcons,
} from "@/components/assessment-center/assessment-center-section-page";

export default function AssessmentClassesPage() {
  return (
    <AssessmentCenterSectionPage
      badge="Classes Comparison"
      title="تحليل الصفوف والفصول"
      description="مقارنة الصفوف والفصول لمعرفة مواطن القوة والضعف على مستوى المدرسة."
      icon={assessmentSectionIcons.classes}
      items={[
        {
          title: "مقارنة الصفوف",
          description: "مقارنة متوسطات الصفوف ونسب التعثر والإتقان.",
        },
        {
          title: "مقارنة الفصول",
          description: "اكتشاف أكثر فصل يحتاج تدخلًا أو متابعة جماعية.",
        },
        {
          title: "أفضل وأضعف فصل",
          description: "تحديد الفصول الأعلى أداءً والأقل أداءً بشكل واضح.",
        },
        {
          title: "تدخل جماعي",
          description: "اقتراح برنامج جماعي إذا ظهر ضعف في فصل كامل.",
        },
      ]}
    />
  );
}