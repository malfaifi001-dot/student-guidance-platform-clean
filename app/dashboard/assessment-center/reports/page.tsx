import {
  AssessmentCenterSectionPage,
  assessmentSectionIcons,
} from "@/components/assessment-center/assessment-center-section-page";

export default function AssessmentReportsPage() {
  return (
    <AssessmentCenterSectionPage
      badge="Exports & Reports"
      title="التقارير والتصدير"
      description="تجهيز تقارير عملية وجميلة بصيغ Excel وPDF بعد توفر التحليل الحقيقي."
      icon={assessmentSectionIcons.reports}
      items={[
        {
          title: "تصدير Excel",
          description: "تصدير كامل للطلاب، المواد، الفصول، المؤشرات، والطلاب المحتاجين متابعة.",
        },
        {
          title: "تقرير PDF",
          description: "قالب PDF احترافي للإدارة أو الموجه يتضمن KPI ورسوم وتوصيات.",
        },
        {
          title: "تقرير ولي الأمر",
          description: "تقرير فردي مبسط للطالب يمكن استخدامه في التواصل الأسري.",
        },
        {
          title: "تقرير علاجي",
          description: "تقرير يركز على خطة علاجية للفصل أو المادة أو الطالب.",
        },
      ]}
    />
  );
}