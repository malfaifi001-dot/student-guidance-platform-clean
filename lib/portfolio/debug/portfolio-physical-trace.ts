export type PortfolioPhysicalTracePayload = Record<string, unknown>;

const TRACE_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.PORTFOLIO_PHYSICAL_TRACE === "1";

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

