import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityExecutionCardReport } from "@/components/activity-programs/reports/activity-execution-card-report";
import { ReportPrintButton } from "@/components/activity-programs/reports/report-print-button";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { getActivityLeaderReportTemplateConfig } from "@/lib/activity-programs/activity-report-templates";

type PageProps = {
  params: Promise<{
    templateId: string;
  }>;
};

function buildSampleSignatureUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="130" viewBox="0 0 420 130">
      <rect width="420" height="130" fill="white"/>
      <path d="M35 78 C80 28, 105 110, 145 62 C176 25, 198 103, 232 66 C260 36, 282 82, 315 58 C342 39, 368 55, 392 45"
        fill="none" stroke="#0f172a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M70 94 C142 104, 230 102, 360 92"
        fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getSampleActivityReportData() {
  return {
    identity: {
      ministryName: "وزارة التعليم",
      educationDepartment: "الإدارة العامة للتعليم بمنطقة عسير",
      educationOffice: "مكتب التعليم",
      schoolName: "ثانوية نموذجية",
      academicYear: "2026",
      semester: "الفصل الدراسي الثالث",
      ministryLogoUrl: "/uploads/school-logos/MOE.png",
    },
    activity: {
      domain: "العلوم والتقنية",
      title: "تطبيقات STEM في الحياة اليومية",
      teacherName: "أحمد محمد القحطاني",
      activityDate: "2026/05/12",
      targetGroup: "طلاب المرحلة الثانوية",
      beneficiaryCount: "45 طالبًا",
      location: "معمل العلوم",
      implementationDescription:
        "تم تنفيذ النشاط ضمن برامج مجال العلوم والتقنية بهدف تعزيز مهارات التفكير العلمي والتطبيق العملي لدى الطلاب، واشتمل التنفيذ على عرض تطبيقي وتجارب قصيرة ومناقشة جماعية حول أثر التقنية في الحياة اليومية.",
      objectives: [
        "تعزيز التفكير العلمي لدى الطلاب.",
        "ربط المفاهيم التقنية بتطبيقات واقعية.",
        "تنمية مهارات العمل الجماعي.",
      ],
      procedures: [
        "تهيئة مكان النشاط وتجهيز الأدوات.",
        "تنفيذ عرض تطبيقي أمام الطلاب.",
        "تقسيم الطلاب إلى مجموعات عمل.",
      ],
      indicators: [
        "تفاعل الطلاب أثناء النشاط.",
        "توثيق الشواهد والمخرجات.",
        "تحقق أهداف النشاط وفق الخطة.",
      ],
    },
    evidences: [
      {
        id: "evidence-1",
        title: "صورة من تنفيذ النشاط",
        fileName: "activity-photo-1.jpg",
      },
      {
        id: "evidence-2",
        title: "مشاركة الطلاب",
        fileName: "students-participation.jpg",
      },
      {
        id: "evidence-3",
        title: "مخرجات النشاط",
        fileName: "outputs.jpg",
      },
      {
        id: "evidence-4",
        title: "توثيق ختامي",
        fileName: "closing.jpg",
      },
    ],
    approvals: {
      teacherSignedName: "أحمد محمد القحطاني",
      teacherSignatureUrl: buildSampleSignatureUrl(),
      activityLeaderName: "رائد النشاط",
      principalName: "مدير المدرسة",
    },
  };
}

export default async function ActivityLeaderReportTemplatePreviewPage({
  params,
}: PageProps) {
  await requireAdminPage();

  const { templateId } = await params;
  const config = getActivityLeaderReportTemplateConfig(templateId);

  if (!config) {
    notFound();
  }

  if (config.id !== "activity-execution-card") {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] border border-amber-100 bg-white p-8 shadow-sm">
          <p className="text-sm font-black text-amber-700">معاينة القالب</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            {config.name}
          </h1>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
            هذا القالب مخطط لاحقًا. المعاينة الفعلية متاحة الآن لقالب بطاقة
            تنفيذ برنامج نشاط طلابي.
          </p>

          <Link
            href="/dashboard/admin/report-templates/activity-leader"
            className="mt-5 inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            العودة لقوالب رائد النشاط
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6" dir="rtl">
      <section className="no-print rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-700">
              معاينة قالب رائد النشاط
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {config.name}
            </h1>

            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              هذه معاينة ببيانات تجريبية. لاحقًا سيتم فتح نفس القالب من حالة
              نشاط معتمدة ليسحب البيانات والشواهد والتوقيع تلقائيًا.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/report-templates/activity-leader"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              العودة
            </Link>

            <ReportPrintButton />
          </div>
        </div>
      </section>

      <ActivityExecutionCardReport data={getSampleActivityReportData()} />
    </main>
  );
}