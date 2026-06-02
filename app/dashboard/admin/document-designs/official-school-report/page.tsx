import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { ReportTemplateLivePreview } from "@/components/report-engine/report-template-live-preview";
import {
  initialReportTemplateBuilderPresets,
  initialReportTextSnippets,
} from "@/lib/report-engine/report-template-builder-presets";

export default async function OfficialSchoolReportDesignPreviewPage() {
  await requireAdminPage();

  const template =
    initialReportTemplateBuilderPresets.find(
      (item) => item.id === "tpl-official-school-report"
    ) || initialReportTemplateBuilderPresets[0];

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-emerald-700">معاينة التصاميم</p>

        <h1 className="mt-2 text-2xl font-black text-slate-900">
          القالب الرسمي المدرسي
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
          معاينة القالب الرسمي متعدد الصفحات: غلاف، ملخص، تفاصيل، شواهد، واعتماد.
        </p>
      </section>

      <ReportTemplateLivePreview
        template={template}
        snippets={initialReportTextSnippets}
        previewCaseData={null}
      />
    </main>
  );
}
