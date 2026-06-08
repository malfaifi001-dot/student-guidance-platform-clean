import {
  AssessmentCenterSectionPage,
  assessmentSectionIcons,
} from "@/components/assessment-center/assessment-center-section-page";

export default function AssessmentRiskStudentsPage() {
  return (
    <AssessmentCenterSectionPage
      badge="Risk Students Engine"
      title="الطلاب المعرضون للخطر"
      description="قسم مخصص لاكتشاف الطلاب المحتاجين متابعة أكاديمية أو إرشادية بعد تحليل النتائج."
      icon={assessmentSectionIcons.riskStudents}
      items={[
        {
          title: "انخفاض النسبة",
          description: "تحديد الطلاب ذوي النتائج المنخفضة أو القريبة من التعثر.",
        },
        {
          title: "تعثر في عدة مواد",
          description: "تمييز الطلاب الذين يظهر لديهم ضعف في أكثر من مادة.",
        },
        {
          title: "أولوية المتابعة",
          description: "تصنيف الطلاب حسب درجة الخطر: مرتفع، متوسط، منخفض.",
        },
        {
          title: "إنشاء حالة متابعة",
          description: "زر مستقبلي لإنشاء حالة مرتبطة بالطالب والتحليل والتوصيات.",
        },
      ]}
    />
  );
}