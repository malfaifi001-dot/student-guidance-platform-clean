import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PortfolioDashboard } from "@/components/portfolio/portfolio-dashboard";
import { PortfolioAutoPrint, PortfolioPrintActions } from "@/components/portfolio/print/portfolio-print-actions";
import { PortfolioPrintDocument } from "@/components/portfolio/print/portfolio-print-document";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";
import { getPortfolioRoutes } from "@/lib/portfolio/portfolio-routes";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";

type PortfolioSearchParams = Promise<{ portfolioId?: string | string[] }>;
const SHARED_PORTFOLIO_ROLES = new Set(["COUNSELOR", "SCHOOL_OWNER", "STAFF"]);

function enforceSharedRouteRole(role: string | null | undefined, sharedRoute?: boolean) {
  if (sharedRoute && !SHARED_PORTFOLIO_ROLES.has(role || "")) {
    redirect(getPortfolioRoutes(role).base);
  }
}

async function portfolioPageContext(searchParams: PortfolioSearchParams, sharedRoute?: boolean) {
  const current = await requireDashboardUser();
  if (current.user.role === "ADMIN") redirect("/dashboard/admin");
  enforceSharedRouteRole(current.user.role, sharedRoute);

  const query = await searchParams;
  const portfolioId = Array.isArray(query.portfolioId) ? query.portfolioId[0] : query.portfolioId;
  const workspace = await getPortfolioWorkspace(current.user, portfolioId);
  if (!workspace.ok) redirect("/dashboard/onboarding?required=true");
  return { current, workspace };
}

export async function PortfolioDashboardRoute({ searchParams, sharedRoute }: { searchParams: PortfolioSearchParams; sharedRoute?: boolean }) {
  const { workspace } = await portfolioPageContext(searchParams, sharedRoute);
  return <PortfolioDashboard data={workspace} />;
}

export async function PortfolioPreviewRoute({ searchParams, sharedRoute }: { searchParams: PortfolioSearchParams; sharedRoute?: boolean }) {
  const { workspace } = await portfolioPageContext(searchParams, sharedRoute);
  return <main dir="rtl"><PortfolioPrintDocument data={{ ...workspace, customEvidence: workspace.customEvidence.filter((item) => item.isVisible && Boolean(item.fileUrl)) }} /></main>;
}

export async function PortfolioPrintRoute({ searchParams, sharedRoute }: { searchParams: PortfolioSearchParams; sharedRoute?: boolean }) {
  const { current, workspace } = await portfolioPageContext(searchParams, sharedRoute);
  return (
    <main dir="rtl">
      <PortfolioPrintActions backHref={getPortfolioRoutes(current.user.role).base} />
      <PortfolioPrintDocument data={{ ...workspace, customEvidence: workspace.customEvidence.filter((item) => item.isVisible && Boolean(item.fileUrl)) }} />
    </main>
  );
}

export async function PortfolioSnapshotRoute({
  params,
  searchParams,
  sharedRoute,
}: {
  params: Promise<{ snapshotId: string }>;
  searchParams: Promise<{ print?: string | string[] }>;
  sharedRoute?: boolean;
}) {
  const current = await requireDashboardUser();
  if (current.user.role === "ADMIN") redirect("/dashboard/admin");
  enforceSharedRouteRole(current.user.role, sharedRoute);
  const { snapshotId } = await params;
  const query = await searchParams;
  const printValue = Array.isArray(query.print) ? query.print[0] : query.print;
  const snapshot = await getPortfolioSnapshot(current.user, snapshotId);
  const routes = getPortfolioRoutes(current.user.role);

  return (
    <main dir="rtl">
      <PortfolioAutoPrint enabled={printValue === "1"} />
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href={`${routes.base}?portfolioId=${encodeURIComponent(snapshot.portfolioId)}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50">
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
