import { GuardianSummonsPreviewToolbar } from "@/components/guardian-summons/guardian-summons-preview-toolbar";
import { GuardianSummonsTemplate } from "@/components/reports/guardian-summons/guardian-summons-template";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { getGuardianSummonsReportData } from "@/lib/guardian-summons/guardian-summons-template-data";

type PageProps = { params: Promise<{ caseId: string }> };

export default async function GuardianSummonsPreviewPage({
  params,
}: PageProps) {
  const [{ caseId }, context] = await Promise.all([
    params,
    requireDashboardPageContext(),
  ]);
  const { data } = await getGuardianSummonsReportData(caseId, context);

  return (
    <main className="space-y-5 px-1 py-2" dir="rtl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-950">
              معاينة الاستدعاء
            </h1>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              راجع خطاب استدعاء ولي الأمر قبل الطباعة أو الحفظ بصيغة PDF.
            </p>
          </div>
          <GuardianSummonsPreviewToolbar caseId={caseId} />
        </div>
      </section>

      <section className="overflow-x-auto rounded-[2rem] border border-slate-200 bg-slate-200/70 px-3 py-6 shadow-inner sm:px-6">
        <div className="mx-auto min-w-[794px]">
          <GuardianSummonsTemplate data={data} />
        </div>
      </section>
    </main>
  );
}
