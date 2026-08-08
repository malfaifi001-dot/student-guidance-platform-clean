import type { CSSProperties } from "react";

export const REPORT_SMART_A4_MODES = [
  "normal",
  "compact",
  "dense",
  "minimum-safe",
] as const;

export type ReportSmartA4Mode = (typeof REPORT_SMART_A4_MODES)[number];
export type ReportSmartA4PriorityMode = "signature" | "general";

export type ReportSmartA4Profile = {
  mode: ReportSmartA4Mode;

  contentScale: number;

  blockGapRem: number;
  sectionGapRem: number;
  paragraphGapRem: number;

  contentLineHeight: number;
  narrativeLineHeight: number;
  narrativeDensityScale: number;
  contentFontScale: number;

  headingGapRem: number;
  headingLineHeight: number;
  headingScale: number;

  fieldGapRem: number;
  fieldPaddingXRem: number;
  fieldPaddingYRem: number;
  fieldLabelScale: number;
  fieldValueScale: number;
  fieldValueTopGapRem: number;
  fieldValueItemGapRem: number;
  valueGridGapRem: number;
  fieldSpacingScale: number;

  bulletGapRem: number;
  bulletLineHeight: number;
  bulletFontScale: number;

  tablePaddingXRem: number;
  tablePaddingYRem: number;
  tableHeaderPaddingYRem: number;
  tableFontScale: number;
  tableLineHeight: number;
  tableSpacingScale: number;

  signatureTopGapRem: number;
  signatureImageHeightMm: number;
  signatureNameScale: number;
  signatureLabelScale: number;
  signatureSafetyGapPx: number;

  evidenceGapRem: number;
  evidenceSpacingScale: number;
  evidenceCaptionScale: number;
  evidenceMaxHeightMm: number;

  captionFontScale: number;
};

export const REPORT_SMART_A4_PROFILES: readonly ReportSmartA4Profile[] = [
  {
    mode: "normal",

    contentScale: 1,

    blockGapRem: 1,
    sectionGapRem: 0.75,
    paragraphGapRem: 0.75,

    contentLineHeight: 2,
    narrativeLineHeight: 2,
    narrativeDensityScale: 1,
    contentFontScale: 1,

    headingGapRem: 0.75,
    headingLineHeight: 1.65,
    headingScale: 1,

    fieldGapRem: 0.5,
    fieldPaddingXRem: 0.75,
    fieldPaddingYRem: 0.5,
    fieldLabelScale: 1,
    fieldValueScale: 1,
    fieldValueTopGapRem: 0.25,
    fieldValueItemGapRem: 0.25,
    valueGridGapRem: 0.5,
    fieldSpacingScale: 1,

    bulletGapRem: 0.5,
    bulletLineHeight: 1.75,
    bulletFontScale: 1,

    tablePaddingXRem: 0.75,
    tablePaddingYRem: 0.75,
    tableHeaderPaddingYRem: 0.75,
    tableFontScale: 1,
    tableLineHeight: 1.5,
    tableSpacingScale: 1,

    signatureTopGapRem: 1.5,
    signatureImageHeightMm: 10,
    signatureNameScale: 1,
    signatureLabelScale: 1,
    signatureSafetyGapPx: 14,

    evidenceGapRem: 1,
    evidenceSpacingScale: 1,
    evidenceCaptionScale: 1,
    evidenceMaxHeightMm: 78,

    captionFontScale: 1,
  },

  {
    mode: "compact",

    contentScale: 1,

    blockGapRem: 0.72,
    sectionGapRem: 0.54,
    paragraphGapRem: 0.46,

    contentLineHeight: 1.82,
    narrativeLineHeight: 1.82,
    narrativeDensityScale: 0.91,
    contentFontScale: 0.985,

    headingGapRem: 0.5,
    headingLineHeight: 1.54,
    headingScale: 0.98,

    fieldGapRem: 0.36,
    fieldPaddingXRem: 0.58,
    fieldPaddingYRem: 0.34,
    fieldLabelScale: 0.98,
    fieldValueScale: 0.99,
    fieldValueTopGapRem: 0.16,
    fieldValueItemGapRem: 0.16,
    valueGridGapRem: 0.34,
    fieldSpacingScale: 0.76,

    bulletGapRem: 0.32,
    bulletLineHeight: 1.6,
    bulletFontScale: 0.98,

    tablePaddingXRem: 0.6,
    tablePaddingYRem: 0.48,
    tableHeaderPaddingYRem: 0.46,
    tableFontScale: 0.98,
    tableLineHeight: 1.4,
    tableSpacingScale: 0.72,

    signatureTopGapRem: 0.9,
    signatureImageHeightMm: 10,
    signatureNameScale: 0.98,
    signatureLabelScale: 0.98,
    signatureSafetyGapPx: 10,

    evidenceGapRem: 0.7,
    evidenceSpacingScale: 0.8,
    evidenceCaptionScale: 0.98,
    evidenceMaxHeightMm: 62,

    captionFontScale: 0.98,
  },

  {
    mode: "dense",

    contentScale: 1,

    blockGapRem: 0.5,
    sectionGapRem: 0.36,
    paragraphGapRem: 0.28,

    contentLineHeight: 1.62,
    narrativeLineHeight: 1.62,
    narrativeDensityScale: 0.82,
    contentFontScale: 0.95,

    headingGapRem: 0.34,
    headingLineHeight: 1.43,
    headingScale: 0.95,

    fieldGapRem: 0.26,
    fieldPaddingXRem: 0.44,
    fieldPaddingYRem: 0.24,
    fieldLabelScale: 0.96,
    fieldValueScale: 0.97,
    fieldValueTopGapRem: 0.1,
    fieldValueItemGapRem: 0.1,
    valueGridGapRem: 0.24,
    fieldSpacingScale: 0.56,

    bulletGapRem: 0.18,
    bulletLineHeight: 1.48,
    bulletFontScale: 0.94,

    tablePaddingXRem: 0.44,
    tablePaddingYRem: 0.3,
    tableHeaderPaddingYRem: 0.28,
    tableFontScale: 0.94,
    tableLineHeight: 1.32,
    tableSpacingScale: 0.52,

    signatureTopGapRem: 0.52,
    signatureImageHeightMm: 9.5,
    signatureNameScale: 0.96,
    signatureLabelScale: 0.95,
    signatureSafetyGapPx: 8,

    evidenceGapRem: 0.48,
    evidenceSpacingScale: 0.62,
    evidenceCaptionScale: 0.94,
    evidenceMaxHeightMm: 48,

    captionFontScale: 0.94,
  },

  {
    mode: "minimum-safe",

    contentScale: 1,

    blockGapRem: 0.34,
    sectionGapRem: 0.24,
    paragraphGapRem: 0.16,

    contentLineHeight: 1.48,
    narrativeLineHeight: 1.48,
    narrativeDensityScale: 0.76,
    contentFontScale: 0.91,

    headingGapRem: 0.22,
    headingLineHeight: 1.35,
    headingScale: 0.91,

    fieldGapRem: 0.18,
    fieldPaddingXRem: 0.34,
    fieldPaddingYRem: 0.14,
    fieldLabelScale: 0.94,
    fieldValueScale: 0.95,
    fieldValueTopGapRem: 0.06,
    fieldValueItemGapRem: 0.06,
    valueGridGapRem: 0.16,
    fieldSpacingScale: 0.48,

    bulletGapRem: 0.1,
    bulletLineHeight: 1.4,
    bulletFontScale: 0.9,

    tablePaddingXRem: 0.34,
    tablePaddingYRem: 0.16,
    tableHeaderPaddingYRem: 0.14,
    tableFontScale: 0.92,
    tableLineHeight: 1.25,
    tableSpacingScale: 0.38,

    signatureTopGapRem: 0.24,
    signatureImageHeightMm: 9,
    signatureNameScale: 0.92,
    signatureLabelScale: 0.9,
    signatureSafetyGapPx: 6,

    evidenceGapRem: 0.32,
    evidenceSpacingScale: 0.48,
    evidenceCaptionScale: 0.9,
    evidenceMaxHeightMm: 36,

    captionFontScale: 0.9,
  },
] as const;

export const REPORT_SMART_A4_TOLERANCE_PX = 2;

type SmartA4Style =
  CSSProperties &
  Record<`--report-${string}`, string | number>;

export function getReportSmartA4Profile(mode: ReportSmartA4Mode) {
  return (
    REPORT_SMART_A4_PROFILES.find(
      (profile) => profile.mode === mode,
    ) || REPORT_SMART_A4_PROFILES[0]
  );
}

export function getReportSmartA4StyleVariables(
  profile: ReportSmartA4Profile,
): SmartA4Style {
  return {
    "--report-smart-scale": profile.contentScale,

    "--report-block-gap": `${profile.blockGapRem}rem`,
    "--report-section-gap": `${profile.sectionGapRem}rem`,
    "--report-paragraph-gap": `${profile.paragraphGapRem}rem`,

    "--report-content-line-height": profile.contentLineHeight,
    "--report-narrative-line-height": profile.narrativeLineHeight,
    "--report-narrative-density-scale": profile.narrativeDensityScale,
    "--report-content-font-scale": profile.contentFontScale,

    "--report-heading-gap": `${profile.headingGapRem}rem`,
    "--report-heading-line-height": profile.headingLineHeight,
    "--report-heading-scale": profile.headingScale,

    "--report-field-gap": `${profile.fieldGapRem}rem`,
    "--report-field-padding-x": `${profile.fieldPaddingXRem}rem`,
    "--report-field-padding-y": `${profile.fieldPaddingYRem}rem`,
    "--report-field-label-scale": profile.fieldLabelScale,
    "--report-field-value-scale": profile.fieldValueScale,
    "--report-field-value-top-gap": `${profile.fieldValueTopGapRem}rem`,
    "--report-field-value-item-gap": `${profile.fieldValueItemGapRem}rem`,
    "--report-value-grid-gap": `${profile.valueGridGapRem}rem`,
    "--report-field-spacing-scale": profile.fieldSpacingScale,

    "--report-bullet-gap": `${profile.bulletGapRem}rem`,
    "--report-bullet-line-height": profile.bulletLineHeight,
    "--report-bullet-font-scale": profile.bulletFontScale,

    "--report-table-padding-x": `${profile.tablePaddingXRem}rem`,
    "--report-table-padding-y": `${profile.tablePaddingYRem}rem`,
    "--report-table-header-padding-y": `${profile.tableHeaderPaddingYRem}rem`,
    "--report-table-font-scale": profile.tableFontScale,
    "--report-table-line-height": profile.tableLineHeight,
    "--report-table-spacing-scale": profile.tableSpacingScale,

    "--report-signature-top-gap": `${profile.signatureTopGapRem}rem`,
    "--report-signature-image-height": `${profile.signatureImageHeightMm}mm`,
    "--report-signature-name-scale": profile.signatureNameScale,
    "--report-signature-label-scale": profile.signatureLabelScale,
    "--report-signature-safety-gap": `${profile.signatureSafetyGapPx}px`,

    "--report-evidence-gap": `${profile.evidenceGapRem}rem`,
    "--report-evidence-spacing-scale": profile.evidenceSpacingScale,
    "--report-evidence-caption-scale": profile.evidenceCaptionScale,
    "--report-evidence-max-height": `${profile.evidenceMaxHeightMm}mm`,

    "--report-caption-font-scale": profile.captionFontScale,
  };
}
