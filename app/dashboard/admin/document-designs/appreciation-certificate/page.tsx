import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import {
  AppreciationCertificatePreview,
  appreciationCertificatePreviewCaseData,
  appreciationCertificateTemplatePreset,
} from "@/components/report-engine/appreciation-certificate-preview";

export default async function AppreciationCertificateDesignPage() {
  await requireAdminPage();

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-emerald-700">تصاميم المستندات</p>

        <h1 className="mt-2 text-2xl font-black text-slate-900">
          قالب شهادة شكر وتقدير
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
          قالب شهادة شكر لخدمة متابعة الطلاب. النص ثابت، والمتغيرات من هوية
          المدرسة والطالب وسجل المتابعة والإحصاء.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/dashboard/student-follow-up/appreciation-certificates"
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white"
          >
            فتح شهادات الشكر
          </a>

          <span className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">
            appreciation-certificate-v1
          </span>
        </div>
      </section>

      <AppreciationCertificatePreview
        template={appreciationCertificateTemplatePreset}
        previewCaseData={appreciationCertificatePreviewCaseData}
        showDynamicFields
      />
    </main>
  );
}
