import {
  buildReferenceLibraryViewer,
  getVisibleReferenceLibraryItem,
  listVisibleReferenceLibraryItems,
} from "@/lib/reference-library/reference-library-public-service";
import type { PublicReferenceLibraryDownloadVariant, PublicReferenceLibraryItem } from "@/lib/reference-library/reference-library-types";

const publicCounselorViewer = buildReferenceLibraryViewer({
  id: "public-counselor-reference-library",
  role: "COUNSELOR",
  schoolAccountId: null,
});

type PublicSourceItem = {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  itemType: "FOLDER" | "FILE";
  allowDownload: boolean;
  originalFileName?: string | null;
  storageKey?: string | null;
  originalStorageKey?: string | null;
  mimeType?: string | null;
  fileExtension?: string | null;
  sizeBytes?: number | null;
  pdfFileName?: string | null;
  pdfStorageKey?: string | null;
  pdfMimeType?: string | null;
  pdfSizeBytes?: number | null;
  docxFileName?: string | null;
  docxStorageKey?: string | null;
  docxMimeType?: string | null;
  docxSizeBytes?: number | null;
  previewStorageKey?: string | null;
  previewMimeType?: string | null;
  previewSizeBytes?: number | null;
  pdfCoverApplied: boolean;
  updatedAt: Date;
  childrenCount?: number;
  _count?: { children: number };
};

function toPublicSummary(item: PublicSourceItem): PublicReferenceLibraryItem {
  const downloadVariants: PublicReferenceLibraryDownloadVariant[] = [];
  if (item.pdfStorageKey) downloadVariants.push("PDF");
  if (item.docxStorageKey) downloadVariants.push("DOCX");
  if ((item.storageKey || item.originalStorageKey) && !downloadVariants.length) downloadVariants.push("ORIGINAL");

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
    fileName: item.originalFileName || item.pdfFileName || item.docxFileName || null,
    mimeType: item.mimeType || item.pdfMimeType || item.docxMimeType || null,
    fileExtension: item.fileExtension || null,
    sizeBytes: item.sizeBytes ?? item.pdfSizeBytes ?? item.docxSizeBytes ?? null,
    updatedAt: item.updatedAt.toISOString(),
    previewAvailable: Boolean(item.pdfStorageKey),
    downloadVariants,
  };
}

async function getPublicDetailedItem(itemId: string) {
  return getVisibleReferenceLibraryItem({
    itemId,
    viewer: publicCounselorViewer,
  });
}

export async function listAnonymousReferenceLibraryItems(input: { parentId: string | null; search?: string | null }) {
  const items = await listVisibleReferenceLibraryItems({
    parentId: input.parentId,
    search: input.search,
    viewer: publicCounselorViewer,
  });

  if (items === null) return null;

  const detailedItems = await Promise.all(items.map((item) => getPublicDetailedItem(item.id)));
  return items.map((item, index) => toPublicSummary(detailedItems[index] || item as PublicSourceItem));
}

export async function getAnonymousReferenceLibraryItem(itemId: string) {
  const item = await getPublicDetailedItem(itemId);
  if (!item) return null;

  if (item.itemType === "FOLDER") {
    return { ...toPublicSummary(item), parent: item.parent };
  }

  return {
    ...toPublicSummary(item),
    originalFileName: item.originalFileName,
    storageKey: item.storageKey,
    originalStorageKey: item.originalStorageKey,
    mimeType: item.mimeType,
    fileExtension: item.fileExtension,
    sizeBytes: item.sizeBytes,
    pdfStorageKey: item.pdfStorageKey,
    pdfFileName: item.pdfFileName,
    pdfMimeType: item.pdfMimeType,
    pdfSizeBytes: item.pdfSizeBytes,
    docxStorageKey: item.docxStorageKey,
    docxFileName: item.docxFileName,
    docxMimeType: item.docxMimeType,
    docxSizeBytes: item.docxSizeBytes,
    previewStorageKey: item.previewStorageKey,
    previewMimeType: item.previewMimeType,
    previewSizeBytes: item.previewSizeBytes,
  };
}

export async function getAnonymousReferenceLibraryFolder(input: { itemId: string; search?: string | null }) {
  const folder = await getAnonymousReferenceLibraryItem(input.itemId);
  if (!folder || folder.itemType !== "FOLDER") return null;

  const items = await listAnonymousReferenceLibraryItems({
    parentId: folder.id,
    search: input.search,
  });

  return { folder, items: items || [] };
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
