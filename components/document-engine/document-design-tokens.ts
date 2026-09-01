import type {
  CSSProperties,
} from "react";

import type {
  DocumentPageOrientation,
} from "./document-layout-types";

export const DOCUMENT_A4_WIDTH_MM = 210;
export const DOCUMENT_A4_HEIGHT_MM = 297;

export const DOCUMENT_DEFAULT_PAGE_PADDING_MM = 12;
export const DOCUMENT_DEFAULT_ZONE_GAP_MM = 4;

export type DocumentDesignTokens = {
  pageWidthMm: number;
  pageHeightMm: number;

  pagePaddingMm: number;
  zoneGapMm: number;

  background: string;
  foreground: string;
};

export const DEFAULT_DOCUMENT_DESIGN_TOKENS:
  DocumentDesignTokens = {
  pageWidthMm: DOCUMENT_A4_WIDTH_MM,
  pageHeightMm: DOCUMENT_A4_HEIGHT_MM,

  pagePaddingMm:
    DOCUMENT_DEFAULT_PAGE_PADDING_MM,

  zoneGapMm:
    DOCUMENT_DEFAULT_ZONE_GAP_MM,

  background: "#ffffff",
  foreground: "#0f172a",
};

export function getDocumentA4Dimensions(
  orientation: DocumentPageOrientation =
    "portrait",
) {
  if (orientation === "landscape") {
    return {
      widthMm: DOCUMENT_A4_HEIGHT_MM,
      heightMm: DOCUMENT_A4_WIDTH_MM,
    };
  }

  return {
    widthMm: DOCUMENT_A4_WIDTH_MM,
    heightMm: DOCUMENT_A4_HEIGHT_MM,
  };
}

export function getDocumentPageStyle({
  tokens = DEFAULT_DOCUMENT_DESIGN_TOKENS,
  orientation = "portrait",
  fixedHeight = true,
}: {
  tokens?: DocumentDesignTokens;
  orientation?: DocumentPageOrientation;
  fixedHeight?: boolean;
} = {}): CSSProperties {
  const dimensions =
    orientation === "landscape"
      ? {
          widthMm: tokens.pageHeightMm,
          heightMm: tokens.pageWidthMm,
        }
      : {
          widthMm: tokens.pageWidthMm,
          heightMm: tokens.pageHeightMm,
        };

  return {
    width: `${dimensions.widthMm}mm`,
    minWidth: `${dimensions.widthMm}mm`,
    maxWidth: `${dimensions.widthMm}mm`,

    height: fixedHeight
      ? `${dimensions.heightMm}mm`
      : "auto",

    minHeight: `${dimensions.heightMm}mm`,

    maxHeight: fixedHeight
      ? `${dimensions.heightMm}mm`
      : "none",

    boxSizing: "border-box",

    background: tokens.background,
    color: tokens.foreground,

    breakAfter: "page",
    breakInside: "avoid",
  };
}