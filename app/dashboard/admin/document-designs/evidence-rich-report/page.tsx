import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { ReportTemplateLivePreview } from "@/components/report-engine/report-template-live-preview";
import { initialReportTextSnippets } from "@/lib/report-engine/report-template-builder-presets";
import { extraOfficialReportTemplatePresets } from "@/lib/report-engine/extra-official-template-presets";

export default async function EvidenceRichReportDesignPreviewPage() {
  await requireAdminPage();

  const template =
    extraOfficialReportTemplatePresets.find(
      (item) => item.id === "tpl-evidence-rich-report",
    ) || extraOfficialReportTemplatePresets[0];

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-emerald-700">معاينة التصاميم</p>

        <h1 className="mt-2 text-2xl font-black text-slate-900">
          تقرير الشواهد المصور
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
          تصميم مخصص للتقارير التي تعتمد على الصور والمرفقات. الشواهد تظهر في
          صفحات A4 مستقلة بدل تمديد صفحة واحدة طويلة.
        </p>

        <a
          href="/dashboard/admin/report-templates?design=evidence-rich-report"
          className="mt-4 inline-flex rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white"
        >
          فتحه داخل الاستديو
        </a>
      </section>

      <ReportTemplateLivePreview
        template={template}
        snippets={initialReportTextSnippets}
        previewCaseData={null}
      />
    </main>
  );
}
