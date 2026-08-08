import type { ReportBlockPresentation } from "../report-block-presentation";

export type MoeOfficial2024BlockPresentation = {
  shellClassName: string;
  titleClassName: string;
  contentClassName: string;
};

const presentations: Record<
  ReportBlockPresentation,
  MoeOfficial2024BlockPresentation
> = {
  hero: {
    shellClassName:
      "moe24-report-section moe24-report-section-hero",
    titleClassName:
      "moe24-report-block-title moe24-report-block-title-hero",
    contentClassName:
      "moe24-report-block-content moe24-report-block-content-hero",
  },

  normal: {
    shellClassName:
      "moe24-report-section moe24-report-section-normal",
    titleClassName:
      "moe24-report-block-title",
    contentClassName:
      "moe24-report-block-content",
  },

  card: {
    shellClassName:
      "moe24-report-section moe24-report-details-panel moe24-report-section-card",
    titleClassName:
      "moe24-report-block-title",
    contentClassName:
      "moe24-report-block-content",
  },

  soft: {
    shellClassName:
      "moe24-report-section moe24-report-details-panel moe24-report-section-soft",
    titleClassName:
      "moe24-report-block-title",
    contentClassName:
      "moe24-report-block-content",
  },

  featured: {
    shellClassName:
      "moe24-report-section moe24-report-details-panel moe24-report-section-featured",
    titleClassName:
      "moe24-report-block-title moe24-report-block-title-featured",
    contentClassName:
      "moe24-report-block-content",
  },

  outline: {
    shellClassName:
      "moe24-report-section moe24-report-details-panel moe24-report-section-outline",
    titleClassName:
      "moe24-report-block-title",
    contentClassName:
      "moe24-report-block-content",
  },

  list: {
    shellClassName:
      "moe24-report-section moe24-report-section-list",
    titleClassName:
      "moe24-report-block-title",
    contentClassName:
      "moe24-report-block-content moe24-report-block-content-list",
  },
};

export function getMoeOfficial2024BlockPresentation(
  presentation: ReportBlockPresentation,
) {
  return presentations[presentation];
}