import type {
  DocumentModel,
} from "./document-types";

export type DocumentDataAdapter<
  TSource,
> = {
  documentType: string;

  canHandle?: (
    source: TSource,
  ) => boolean;

  toDocumentModel: (
    source: TSource,
  ) =>
    | DocumentModel
    | Promise<DocumentModel>;
};

export async function runDocumentDataAdapter<
  TSource,
>(
  adapter: DocumentDataAdapter<TSource>,
  source: TSource,
): Promise<DocumentModel> {
  if (
    adapter.canHandle &&
    !adapter.canHandle(source)
  ) {
    throw new Error(
      `Document adapter "${adapter.documentType}" cannot handle the provided source.`,
    );
  }

  return adapter.toDocumentModel(
    source,
  );
}