"use client";

export * from "./shared/report-design-engine";
export {
  DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
  SELECTABLE_REPORT_DESIGN_IDS,
  isSelectableReportDesignId,
  selectableReportDesignTemplates,
} from "./shared/report-design-engine";
export {
  DEFAULT_REPORT_HEADER_SETTINGS,
  getReportHeaderSettingsStyle,
  normalizeReportHeaderSettings,
  type ReportHeaderSettings,
} from "./shared/report-header";
export {
  getDesignLogoFilter,
  getDesignLogoFit,
  getDesignLogoNumber,
  getDesignLogoSrc,
  getReportDesignLogoStyleText,
} from "./shared/report-logo";
export { collectFinalValues } from "./shared/final-report";
export { A4DesignPage } from "./shared/report-blocks";
