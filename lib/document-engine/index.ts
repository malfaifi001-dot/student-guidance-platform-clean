export {
  normalizeDocumentModel,
} from "./document-runtime";

export {
  runDocumentDataAdapter,
} from "./document-data-adapter";

export {
  curriculumDistributionDocumentAdapter,
} from "./adapters/curriculum-distribution-document-adapter";

export type {
  CurriculumDistributionDocumentSource,
} from "./adapters/curriculum-distribution-document-adapter";

export type {
  DocumentAttachment,
  DocumentBlock,
  DocumentFieldItem,
  DocumentFooterModel,
  DocumentHeaderModel,
  DocumentModel,
  DocumentSection,
  DocumentSignature,
  DocumentTableColumn,
  DocumentTableRow,
  DocumentValue,
} from "./document-types";

export type {
  DocumentDataAdapter,
} from "./document-data-adapter";

export type {
  NormalizedDocumentModel,
} from "./document-runtime";