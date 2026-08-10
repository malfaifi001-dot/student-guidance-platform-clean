import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PortfolioPrintDocument } from "@/components/portfolio/print/portfolio-print-document";
import { PortfolioAutoPrint } from "@/components/portfolio/print/portfolio-print-actions";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";

type Props = {
  params: Promise<{ snapshotId: string }>;
  searchParams: Promise<{ print?: string | string[] }>;
};

export default async function PortfolioSnapshotPage({ params, searchParams }: Props) {
  const current = await requireDashboardUser();
  const { snapshotId } = await params;
  const query = await searchParams;
  const printValue = Array.isArray(query.print) ? query.print[0] : query.print;
  const snapshot = await getPortfolioSnapshot(current.user, snapshotId);

  return (
    <main dir="rtl">
      <PortfolioAutoPrint enabled={printValue === "1"} />
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href={`/dashboard/teacher/portfolio?portfolioId=${encodeURIComponent(snapshot.portfolioId)}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى ملف الإنجاز
          </Link>
          <div className="text-left">
            <p className="text-sm font-black text-slate-950">{snapshot.name}</p>
            <p className="text-xs font-bold text-slate-500">نسخة محفوظة للقراءة فقط</p>
          </div>
        </div>
      </div>
      <PortfolioPrintDocument data={snapshot.document} />
    </main>
  );
}
