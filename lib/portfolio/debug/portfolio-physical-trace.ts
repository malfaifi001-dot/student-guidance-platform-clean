export type PortfolioPhysicalTracePayload = Record<string, unknown>;

const isProductionBuild = process.env.NODE_ENV === "production";
const isServerRuntime = typeof window === "undefined";

// The server flag stays private. The browser flag must be public because
// Next.js replaces NEXT_PUBLIC_* references in the client bundle at build time.
const TRACE_ENABLED =
  !isProductionBuild ||
  (isServerRuntime
    ? process.env.PORTFOLIO_PHYSICAL_TRACE === "1"
    : process.env.NEXT_PUBLIC_PORTFOLIO_PHYSICAL_TRACE === "1");

let traceSequence = 0;

export function portfolioPhysicalTrace(
  event: string,
  payload: PortfolioPhysicalTracePayload = {},
) {
  if (!TRACE_ENABLED) return;

  traceSequence += 1;
  const row = { sequence: traceSequence, event, ...payload };
  const traceGlobal = globalThis as typeof globalThis & {
    __PORTFOLIO_PHYSICAL_TRACE__?: PortfolioPhysicalTracePayload[];
  };

  traceGlobal.__PORTFOLIO_PHYSICAL_TRACE__ ||= [];
  traceGlobal.__PORTFOLIO_PHYSICAL_TRACE__.push(row);
  console.log(`[PORTFOLIO-PHYSICAL-TRACE #${traceSequence}] ${event}`, payload);
}
