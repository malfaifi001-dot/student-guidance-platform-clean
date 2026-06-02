

import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import {
  GuardianSummonsLetterPreview,
  guardianSummonsPreviewCaseData,
} from "@/components/report-engine/guardian-summons-letter-preview";
import { initialReportTextSnippets } from "@/lib/report-engine/report-template-builder-presets";
import { resolveGuardianSummonsTemplate } from "@/lib/report-engine/guardian-summons-template-runtime";

export default async function GuardianSummonsDesignPreviewPage() {
  await requireAdminPage();

  const template = await resolveGuardianSummonsTemplate();

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-emerald-700">معاينة التصاميم</p>

        <h1 className="mt-2 text-2xl font-black text-slate-900">
          تصميم استدعاء ولي أمر
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
          هذه الصفحة تعرض آخر نسخة محفوظة من نموذج استدعاء ولي أمر. التعديل
          الحقيقي يتم من صفحة النماذج، وأي نسخة منشورة ستنعكس هنا وفي PDF.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/dashboard/admin/report-templates?design=guardian-summons-letter-v1"
            className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
          >
            تعديل النموذج
          </a>

          <span className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black text-slate-500">
            المصدر الحالي: {template.name}
          </span>
        </div>
      </section>

      <GuardianSummonsLetterPreview
        template={template}
        previewCaseData={guardianSummonsPreviewCaseData}
        snippets={initialReportTextSnippets}
      />
    </main>
  );
}
