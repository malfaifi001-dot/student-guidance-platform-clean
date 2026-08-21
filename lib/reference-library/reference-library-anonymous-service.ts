import {
  buildReferenceLibraryViewer,
  getVisibleReferenceLibraryItem,
  listVisibleReferenceLibraryItems,
} from "@/lib/reference-library/reference-library-public-service";
import type { PublicReferenceLibraryItem } from "@/lib/reference-library/reference-library-types";

const publicCounselorViewer = buildReferenceLibraryViewer({
  id: "public-counselor-reference-library",
  role: "COUNSELOR",
  schoolAccountId: null,
});

function toPublicSummary(item: {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  itemType: "FOLDER" | "FILE";
  allowDownload: boolean;
  pdfStorageKey?: string | null;
  docxStorageKey?: string | null;
  pdfCoverApplied: boolean;
  childrenCount?: number;
  _count?: { children: number };
}): PublicReferenceLibraryItem {
  return {
    id: item.id,
    parentId: item.parentId,
    title: item.title,
    description: item.description,
    itemType: item.itemType,
    allowDownload: item.allowDownload,
    hasPdf: Boolean(item.pdfStorageKey),
    hasDocx: Boolean(item.docxStorageKey),
    pdfCoverApplied: item.pdfCoverApplied,
    childrenCount: item.childrenCount ?? item._count?.children ?? 0,
  };
}

export async function listAnonymousReferenceLibraryItems(input: { parentId: string | null; search?: string | null }) {
  const items = await listVisibleReferenceLibraryItems({
    parentId: input.parentId,
    search: input.search,
    viewer: publicCounselorViewer,
  });

  return items?.map(toPublicSummary) ?? null;
}

export async function getAnonymousReferenceLibraryItem(itemId: string) {
  const item = await getVisibleReferenceLibraryItem({
    itemId,
    viewer: publicCounselorViewer,
  });

  if (!item) return null;

  if (item.itemType === "FOLDER") {
    return { ...toPublicSummary(item), parent: item.parent };
  }

  return {
    ...toPublicSummary(item),
    pdfStorageKey: item.pdfStorageKey,
    pdfFileName: item.pdfFileName,
    pdfMimeType: item.pdfMimeType,
    pdfSizeBytes: item.pdfSizeBytes,
    docxStorageKey: item.docxStorageKey,
    docxFileName: item.docxFileName,
    docxMimeType: item.docxMimeType,
    docxSizeBytes: item.docxSizeBytes,
  };
}

export async function buildAnonymousReferenceLibraryBreadcrumbs(itemId: string | null) {
  const breadcrumbs: Array<{ id: string; title: string }> = [];
  let currentId = itemId;
  let depth = 0;

  while (currentId && depth < 20) {
    const item = await getAnonymousReferenceLibraryItem(currentId);
    if (!item) break;

    breadcrumbs.unshift({ id: item.id, title: item.title });
    currentId = item.parentId;
    depth += 1;
  }

  return breadcrumbs;
}
