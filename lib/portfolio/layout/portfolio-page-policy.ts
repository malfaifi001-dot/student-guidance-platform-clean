export type PortfolioBreakPolicy =
  | "KEEP_WITH_PREVIOUS"
  | "KEEP_TOGETHER"
  | "ALWAYS_NEW_PAGE"
  | "CONTINUE_ON_NEXT_PAGE";

/**
 * Semantic page policy.
 *
 * This policy controls section/page ownership only.
 * It must not contain DOM measurement or candidate-selection logic.
 */
export type PortfolioPagePolicy = {
  startsNewPhysicalPage: boolean;

  dedicatedPage: boolean;

  canContinue: boolean;

  canShareWithNextSection: boolean;
};

export type PortfolioPagePolicyKey =
  | "cover"
  | "table-of-contents"
  | "introduction"
  | "educational-identity"
  | "biography"
  | "qualification"
  | "performance"
  | "service-output"
  | "report"
  | "evidence"
  | "closing";

const dedicated = (
  canContinue: boolean,
): PortfolioPagePolicy => ({
  startsNewPhysicalPage: true,
  dedicatedPage: true,
  canContinue,
  canShareWithNextSection: false,
});

const variable = (
  startsNewPhysicalPage = true,
): PortfolioPagePolicy => ({
  startsNewPhysicalPage,
  dedicatedPage: false,
  canContinue: true,
  canShareWithNextSection: false,
});

/**
 * Central semantic page rules.
 *
 * Unused space on dedicated pages is intentional and must never cause the
 * next semantic section to be merged into that page.
 */
export const PORTFOLIO_PAGE_POLICIES: Record<
  PortfolioPagePolicyKey,
  PortfolioPagePolicy
> = {
  cover: dedicated(false),

  "table-of-contents": dedicated(true),

  introduction: dedicated(true),

  "educational-identity": dedicated(true),

  biography: dedicated(true),

  qualification: dedicated(false),

  performance: variable(true),

  "service-output": variable(true),

  report: variable(true),

  evidence: variable(true),

  closing: dedicated(false),
};

export function getPortfolioPagePolicy(
  key: PortfolioPagePolicyKey,
): PortfolioPagePolicy {
  return PORTFOLIO_PAGE_POLICIES[key];
}

/**
 * Compatibility contract for existing logical/block builders.
 *
 * Physical pagination must eventually be owned by the new measured physical
 * engine, not by these break-policy strings.
 */
export const PORTFOLIO_DEFAULT_BREAK_POLICIES = {
  cover: "ALWAYS_NEW_PAGE",

  sectionDivider: "ALWAYS_NEW_PAGE",

  performanceDivider: "ALWAYS_NEW_PAGE",

  serviceOutput: "CONTINUE_ON_NEXT_PAGE",

  report: "CONTINUE_ON_NEXT_PAGE",

  evidence: "KEEP_TOGETHER",

  closing: "ALWAYS_NEW_PAGE",
} as const satisfies Record<string, PortfolioBreakPolicy>;