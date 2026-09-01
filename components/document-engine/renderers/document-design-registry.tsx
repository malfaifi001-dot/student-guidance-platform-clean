import type {
  ComponentType,
} from "react";

import type {
  DocumentModel,
} from "@/lib/document-engine/document-types";

export type DocumentDesignRendererProps = {
  document: DocumentModel;
};

export type DocumentDesignRenderer =
  ComponentType<DocumentDesignRendererProps>;

const registry =
  new Map<
    string,
    DocumentDesignRenderer
  >();

export function registerDocumentDesign(
  designId: string,
  renderer: DocumentDesignRenderer,
) {
  registry.set(
    designId,
    renderer,
  );
}

export function getDocumentDesign(
  designId: string,
) {
  return registry.get(
    designId,
  );
}

export function hasDocumentDesign(
  designId: string,
) {
  return registry.has(
    designId,
  );
}