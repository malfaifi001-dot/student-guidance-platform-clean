import {
  CurriculumDistributionDocumentPreview,
} from "@/components/document-engine/examples/curriculum-distribution-document-preview";

import {
  DocumentPrintStyles,
} from "@/components/document-engine/document-print-styles";

const demoSource = {
  id: "demo-curriculum-distribution",

  title:
    "توزيع المنهج",

  schoolName:
    "مدرسة تجريبية",

  teacherName:
    "محمد أحمد",

  subjectName:
    "العلوم",

  gradeName:
    "الصف الأول المتوسط",

  semesterName:
    "الفصل الدراسي الأول",

  academicYear:
    "1448 هـ",

  rows: [
    {
      id: "week-1",
      week: "الأسبوع الأول",
      unit: "الوحدة الأولى",
      lesson: "مدخل إلى العلم",
      notes: "تهيئة ومراجعة",
    },
    {
      id: "week-2",
      week: "الأسبوع الثاني",
      unit: "الوحدة الأولى",
      lesson: "طبيعة العلم",
      notes: "",
    },
    {
      id: "week-3",
      week: "الأسبوع الثالث",
      unit: "الوحدة الأولى",
      lesson: "مهارات العلم",
      notes: "",
    },
    {
      id: "week-4",
      week: "الأسبوع الرابع",
      unit: "الوحدة الثانية",
      lesson: "المادة وتغيراتها",
      notes: "تقويم مرحلي",
    },
    {
      id: "week-5",
      week: "الأسبوع الخامس",
      unit: "الوحدة الثانية",
      lesson: "الخواص الفيزيائية",
      notes: "",
    },
    {
      id: "week-6",
      week: "الأسبوع السادس",
      unit: "الوحدة الثانية",
      lesson: "التغيرات الكيميائية",
      notes: "",
    },
  ],

  signature: {
    id: "teacher-signature",
    name: "محمد أحمد",
    title: "معلم المادة",
  },
};

export default async function DocumentEnginePreviewPage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-auto bg-slate-100 px-4 py-8 print:bg-white print:p-0"
    >
      <DocumentPrintStyles />

      <div className="mx-auto mb-6 w-[210mm] print:hidden">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          معاينة تجريبية مستقلة لمحرك المستندات الجديد.
          لا تستخدم Report Engine ولا تعدل توزيع المنهج الحالي.
        </div>
      </div>

      <CurriculumDistributionDocumentPreview
        source={demoSource}
      />
    </main>
  );
}