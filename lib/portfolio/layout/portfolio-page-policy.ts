export type PortfolioBreakPolicy = "KEEP_WITH_PREVIOUS" | "KEEP_TOGETHER" | "ALWAYS_NEW_PAGE" | "CONTINUE_ON_NEXT_PAGE";

export const PORTFOLIO_DEFAULT_BREAK_POLICIES = {
  cover: "ALWAYS_NEW_PAGE",
  sectionDivider: "ALWAYS_NEW_PAGE",
  performanceDivider: "ALWAYS_NEW_PAGE",
  serviceOutput: "KEEP_TOGETHER",
  report: "CONTINUE_ON_NEXT_PAGE",
  evidence: "KEEP_TOGETHER",
  closing: "ALWAYS_NEW_PAGE",
} as const satisfies Record<string, PortfolioBreakPolicy>;

