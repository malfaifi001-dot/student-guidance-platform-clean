import { ArrowRight } from "lucide-react";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PortfolioDashboard } from "@/components/portfolio/portfolio-dashboard";
import { PortfolioPreviewFit } from "@/components/portfolio/portfolio-preview-fit";
import { PortfolioPrintActions } from "@/components/portfolio/print/portfolio-print-actions";
import { PortfolioPrintDocument } from "@/components/portfolio/print/portfolio-print-document";
import { PortfolioPreviewLoadingBoundary } from "@/components/portfolio/portfolio-preview-loading-boundary";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";
import { getPortfolioRoutes } from "@/lib/portfolio/portfolio-routes";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";

type PortfolioSearchParams = Promise<{ portfolioId?: string | string[] }>;
const SHARED_PORTFOLIO_ROLES = new Set(["COUNSELOR", "SCHOOL_OWNER", "STAFF"]);
const PORTFOLIO_PERF_TRACE_ENABLED = process.env.PORTFOLIO_PERF_TRACE === "1";

type PortfolioPerfTrace = {
  traceId: string;
};

function portfolioPerfLog(trace: PortfolioPerfTrace | undefined, stage: string, durationMs: number, details: Record<string, unknown> = {}) {
  if (!trace || !PORTFOLIO_PERF_TRACE_ENABLED) return;
  console.info("[PORTFOLIO_PERF]", JSON.stringify({ traceId: trace.traceId, stage, durationMs: Number(durationMs.toFixed(2)), ...details }));
}

function enforceSharedRouteRole(role: string | null | undefined, sharedRoute?: boolean) {
  if (sharedRoute && !SHARED_PORTFOLIO_ROLES.has(role || "")) {
    redirect(getPortfolioRoutes(role).base);
  }
}

async function portfolioPageContext(searchParams: PortfolioSearchParams, sharedRoute?: boolean, trace?: PortfolioPerfTrace) {
  const contextStartedAt = performance.now();
  const authStartedAt = performance.now();
  const current = await requireDashboardUser();
  portfolioPerfLog(trace, "PortfolioPreviewRoute.requireDashboardUser", performance.now() - authStartedAt, { userIdSuffix: current.user.id.slice(-6) });
  if (current.user.role === "ADMIN") redirect("/dashboard/admin");
  enforceSharedRouteRole(current.user.role, sharedRoute);

  const query = await searchParams;
  const portfolioId = Array.isArray(query.portfolioId) ? query.portfolioId[0] : query.portfolioId;
  const workspaceStartedAt = performance.now();
  const workspace = await getPortfolioWorkspace(current.user, portfolioId, trace);
  portfolioPerfLog(trace, "PortfolioPreviewRoute.getPortfolioWorkspace.total", performance.now() - workspaceStartedAt, { portfolioId: workspace.ok ? workspace.portfolio.id : portfolioId || null });
  if (!workspace.ok) redirect("/dashboard/onboarding?required=true");
  portfolioPerfLog(trace, "PortfolioPreviewRoute.portfolioPageContext.total", performance.now() - contextStartedAt, { portfolioId: workspace.portfolio.id });
  return { current, workspace };
}

export async function PortfolioDashboardRoute({ searchParams, sharedRoute }: { searchParams: PortfolioSearchParams; sharedRoute?: boolean }) {
  const { workspace } = await portfolioPageContext(searchParams, sharedRoute);
  return <PortfolioDashboard data={workspace} />;
}

export async function PortfolioPreviewRoute({ searchParams, sharedRoute }: { searchParams: PortfolioSearchParams; sharedRoute?: boolean }) {
  const trace = PORTFOLIO_PERF_TRACE_ENABLED ? { traceId: randomUUID().slice(0, 12) } : undefined;
  const { workspace } = await portfolioPageContext(searchParams, sharedRoute, trace);
  const workspaceReadyAt = performance.now();
  const tree = (
    <PortfolioPreviewLoadingBoundary><main dir="rtl" className="w-full min-w-0 max-w-full overflow-hidden">
      <div className="mx-auto w-full min-w-0 max-w-[900px]">
        <PortfolioPreviewFit>
          <PortfolioPrintDocument data={{ ...workspace, customEvidence: workspace.customEvidence.filter((item) => item.isVisible && Boolean(item.fileUrl)) }} />
        </PortfolioPreviewFit>
      </div>
    </main></PortfolioPreviewLoadingBoundary>
  );
  portfolioPerfLog(trace, "PortfolioPreviewRoute.workspaceReadyToReactTree", performance.now() - workspaceReadyAt, { portfolioId: workspace.portfolio.id });
  return tree;
}

export async function PortfolioPrintRoute({ searchParams, sharedRoute }: { searchParams: PortfolioSearchParams; sharedRoute?: boolean }) {
  const { current, workspace } = await portfolioPageContext(searchParams, sharedRoute);
  return (
    <main dir="rtl">
      <PortfolioPrintActions
        backHref={getPortfolioRoutes(current.user.role).base}
        downloadHref={`/api/dashboard/portfolio/${encodeURIComponent(workspace.portfolio.id)}/export/pdf`}
        fileName={`${workspace.portfolio.title || "ملف الإنجاز"}.pdf`}
      />
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
  searchParams: Promise<{ print?: string | string[]; pdf?: string | string[] }>;
  sharedRoute?: boolean;
}) {
  const current = await requireDashboardUser();
  if (current.user.role === "ADMIN") redirect("/dashboard/admin");
  enforceSharedRouteRole(current.user.role, sharedRoute);
  const { snapshotId } = await params;
  const query = await searchParams;
  const pdfValue = Array.isArray(query.pdf) ? query.pdf[0] : query.pdf;
  const snapshot = await getPortfolioSnapshot(current.user, snapshotId);
  const routes = getPortfolioRoutes(current.user.role);
  const document = <PortfolioPrintDocument data={snapshot.document} />;

  return (
    <main dir="rtl" className="portfolio-snapshot-route">
      <style>{`
        @media print {
          html.portfolio-print-mode,
          html.portfolio-print-mode body {
            background: #ffffff !important;
            overflow: visible !important;
          }

          html.portfolio-print-mode header,
          html.portfolio-print-mode aside,
          html.portfolio-print-mode nav {
            display: none !important;
          }

          html.portfolio-print-mode .h-screen,
          html.portfolio-print-mode main {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          html.portfolio-print-mode .portfolio-snapshot-route {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href={`${routes.base}?portfolioId=${encodeURIComponent(snapshot.portfolioId)}`}
            aria-label="العودة إلى ملف الإنجاز"
            title="العودة إلى ملف الإنجاز"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="text-left">
            <p className="text-sm font-black text-slate-950">{snapshot.name}</p>
            <p className="text-xs font-bold text-slate-500">نسخة محفوظة للقراءة فقط</p>
          </div>
        </div>
      </div>
      {pdfValue === "1" ? document : (
        <div className="mx-auto w-full min-w-0 max-w-[900px] overflow-hidden">
          <PortfolioPreviewFit>{document}</PortfolioPreviewFit>
        </div>
      )}
    </main>
  );
}
