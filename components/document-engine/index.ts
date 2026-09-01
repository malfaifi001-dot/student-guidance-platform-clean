export {
  DocumentPage,
} from "./shell/document-page";

export {
  DocumentHeaderZone,
} from "./shell/document-header-zone";

export {
  DocumentContentZone,
} from "./shell/document-content-zone";

export {
  DocumentSignatureZone,
} from "./shell/document-signature-zone";

export {
  DocumentFooterZone,
} from "./shell/document-footer-zone";

export {
  DocumentRenderer,
} from "./renderers/document-renderer";

export {
  DocumentBlockRenderer,
} from "./renderers/document-block-renderer";

export {
  DocumentSignatures,
} from "./renderers/document-signatures";

export {
  registerDocumentCustomBlock,
  getDocumentCustomBlockRenderer,
} from "./renderers/document-custom-block-registry";

export {
  registerDocumentDesign,
  getDocumentDesign,
  hasDocumentDesign,
} from "./renderers/document-design-registry";

export {
  DEFAULT_DOCUMENT_DESIGN_TOKENS,
  DOCUMENT_A4_HEIGHT_MM,
  DOCUMENT_A4_WIDTH_MM,
  DOCUMENT_DEFAULT_PAGE_PADDING_MM,
  DOCUMENT_DEFAULT_ZONE_GAP_MM,
  getDocumentA4Dimensions,
  getDocumentPageStyle,
} from "./document-design-tokens";

export type {
  DocumentDirection,
  DocumentPageProps,
  DocumentPageSize,
  DocumentPageOrientation,
  DocumentSignatureAlignment,
  DocumentSignatureZoneProps,
  DocumentZoneProps,
} from "./document-layout-types";