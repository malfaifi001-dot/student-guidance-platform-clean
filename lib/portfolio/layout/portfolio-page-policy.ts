export type PortfolioBreakPolicy = "KEEP_WITH_PREVIOUS" | "KEEP_TOGETHER" | "ALWAYS_NEW_PAGE" | "CONTINUE_ON_NEXT_PAGE";

export type PortfolioPagePolicy = {
  startsNewPhysicalPage: boolean;
  dedicatedPage: boolean;
  canContinue: boolean;
  canShareWithNextSection: boolean;
};

export const PORTFOLIO_PAGE_POLICIES: Record<string, PortfolioPagePolicy> = {
  cover: { startsNewPhysicalPage: true, dedicatedPage: true, canContinue: false, canShareWithNextSection: false },
  introduction: { startsNewPhysicalPage: true, dedicatedPage: true, canContinue: true, canShareWithNextSection: false },
  "educational-identity": { startsNewPhysicalPage: true, dedicatedPage: true, canContinue: true, canShareWithNextSection: false },
  biography: { startsNewPhysicalPage: true, dedicatedPage: true, canContinue: true, canShareWithNextSection: false },
  qualification: { startsNewPhysicalPage: true, dedicatedPage: true, canContinue: false, canShareWithNextSection: false },
  performance: { startsNewPhysicalPage: true, dedicatedPage: false, canContinue: true, canShareWithNextSection: false },
  report: { startsNewPhysicalPage: true, dedicatedPage: false, canContinue: true, canShareWithNextSection: false },
  evidence: { startsNewPhysicalPage: true, dedicatedPage: false, canContinue: true, canShareWithNextSection: false },
  closing: { startsNewPhysicalPage: true, dedicatedPage: true, canContinue: false, canShareWithNextSection: false },
};

export const PORTFOLIO_DEFAULT_BREAK_POLICIES = {
  cover: "ALWAYS_NEW_PAGE",
  sectionDivider: "ALWAYS_NEW_PAGE",
  performanceDivider: "ALWAYS_NEW_PAGE",
  serviceOutput: "KEEP_TOGETHER",
  report: "CONTINUE_ON_NEXT_PAGE",
  evidence: "KEEP_TOGETHER",
  closing: "ALWAYS_NEW_PAGE",
} as const satisfies Record<string, PortfolioBreakPolicy>;
