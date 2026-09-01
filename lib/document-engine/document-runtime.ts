import type {
  DocumentModel,
} from "./document-types";

export type NormalizedDocumentModel =
  DocumentModel & {
    direction: "rtl" | "ltr";
    sections: DocumentModel["sections"];
    signatures: NonNullable<
      DocumentModel["signatures"]
    >;
    attachments: NonNullable<
      DocumentModel["attachments"]
    >;
    metadata: NonNullable<
      DocumentModel["metadata"]
    >;
  };

export function normalizeDocumentModel(
  document: DocumentModel,
): NormalizedDocumentModel {
  return {
    ...document,

    direction:
      document.direction ?? "rtl",

    sections:
      Array.isArray(
        document.sections,
      )
        ? document.sections
        : [],

    signatures:
      Array.isArray(
        document.signatures,
      )
        ? document.signatures
        : [],

    attachments:
      Array.isArray(
        document.attachments,
      )
        ? document.attachments
        : [],

    metadata:
      document.metadata ?? {},
  };
}