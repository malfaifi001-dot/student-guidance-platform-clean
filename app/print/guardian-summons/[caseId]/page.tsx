import { GuardianSummonsTemplate } from "@/components/reports/guardian-summons/guardian-summons-template";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { getGuardianSummonsReportData } from "@/lib/guardian-summons/guardian-summons-template-data";

import { GuardianSummonsPrintController } from "./print-controller";

type PageProps = {
  params: Promise<{ caseId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GuardianSummonsStandalonePrintPage({
  params,
  searchParams,
}: PageProps) {
  const [{ caseId }, query, context] = await Promise.all([
    params,
    searchParams ??
      Promise.resolve({} as Record<string, string | string[] | undefined>),
    requireDashboardPageContext(),
  ]);
  const { data } = await getGuardianSummonsReportData(caseId, context);

  return (
    <main dir="rtl" className="guardian-summons-print-shell">
      <style>{`
        :root, html, body {
          color-scheme: light !important;
          margin: 0 !important;
          background: #e5e7eb !important;
        }
        .guardian-summons-print-shell {
          min-height: 100vh;
          padding: 24px 0;
          background: #e5e7eb;
        }
        @media print {
          :root, html, body, .guardian-summons-print-shell {
            width: 210mm !important;
            min-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }
        }
      `}</style>
      <GuardianSummonsPrintController
        shouldPrint={firstParam(query.print) === "1"}
      />
      <GuardianSummonsTemplate data={data} />
    </main>
  );
}
