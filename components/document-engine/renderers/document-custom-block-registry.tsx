import type {
  ComponentType,
} from "react";

export type DocumentCustomBlockRendererProps = {
  data: unknown;
};

export type DocumentCustomBlockRenderer =
  ComponentType<DocumentCustomBlockRendererProps>;

const registry =
  new Map<
    string,
    DocumentCustomBlockRenderer
  >();

export function registerDocumentCustomBlock(
  key: string,
  renderer: DocumentCustomBlockRenderer,
) {
  registry.set(
    key,
    renderer,
  );
}

export function getDocumentCustomBlockRenderer(
  key: string,
) {
  return registry.get(key);
}