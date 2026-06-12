import type {
  ReportDocumentBlock,
  ReportDocumentDraft,
  ReportDocumentPage,
  ReportEvidenceBlock,
  ReportTableBlock,
} from "@/lib/report-engine/document-draft/report-document-types";
import { sortByOrder } from "@/lib/report-engine/document-draft/report-document-utils";

export type ReportDocumentRenderablePage = ReportDocumentPage & {
  sourcePageId: string;
  physicalPageIndex: number;
  isContinuation: boolean;
};

const A4_CONTENT_CAPACITY = 665;

function estimateTextHeight(text: string, charsPerLine: number, lineHeight: number) {
  const length = String(text || "").trim().length;
  const lines = Math.max(1, Math.ceil(length / charsPerLine));

  return lines * lineHeight;
}

function estimateBlockHeight(block: ReportDocumentBlock) {
  if (block.type === "META_FIELDS") {
    return Math.ceil(block.fields.length / 3) * 48 + 58;
  }

  if (block.type === "NARRATIVE") {
    return 76 + estimateTextHeight(block.body, 58, 24);
  }

  if (block.type === "PARAGRAPH") {
    return 76 + estimateTextHeight(block.body, 58, 24);
  }

  if (block.type === "BULLET_LIST") {
    const lines = String(block.body || "")
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0).length;

    return 76 + Math.max(1, lines) * 28;
  }

  if (block.type === "TABLE") {
    return 58 + 42 + block.rows.length * (block.settings.compact ? 36 : 48);
  }

  if (block.type === "EVIDENCE") {
    if (block.evidenceConfig?.visible === false) return 0;

    const itemsPerPage = block.evidenceConfig?.itemsPerPage ?? 2;

    if (itemsPerPage === 1) return 600;
    if (itemsPerPage === 2) return 390;

    return 360;
  }

  if (block.type === "SIGNATURES") {
    return 132;
  }

  return 80;
}

function splitEvidenceBlock(block: ReportEvidenceBlock): ReportEvidenceBlock[] {
  if (block.evidenceConfig?.visible === false) return [];

  const itemsPerPage = Math.max(1, block.evidenceConfig?.itemsPerPage ?? 2);
  const chunks: ReportEvidenceBlock[] = [];

  for (let index = 0; index < block.evidenceItems.length; index += itemsPerPage) {
    chunks.push({
      ...block,
      id: `${block.id}-part-${chunks.length + 1}`,
      title: chunks.length === 0 ? block.title : `${block.title || "الشواهد"} - تابع`,
      evidenceItems: block.evidenceItems.slice(index, index + itemsPerPage),
      order: block.order + chunks.length / 100,
    });
  }

  return chunks;
}

function splitTableBlock(block: ReportTableBlock): ReportTableBlock[] {
  const maxRowsPerPage = block.settings.compact ? 8 : 6;

  if (block.rows.length <= maxRowsPerPage) return [block];

  const chunks: ReportTableBlock[] = [];

  for (let index = 0; index < block.rows.length; index += maxRowsPerPage) {
    chunks.push({
      ...block,
      id: `${block.id}-part-${chunks.length + 1}`,
      title: chunks.length === 0 ? block.title : `${block.title || "جدول"} - تابع`,
      rows: block.rows.slice(index, index + maxRowsPerPage),
      order: block.order + chunks.length / 100,
    });
  }

  return chunks;
}

function splitLargeBlock(block: ReportDocumentBlock): ReportDocumentBlock[] {
  if (block.type === "EVIDENCE") return splitEvidenceBlock(block);
  if (block.type === "TABLE") return splitTableBlock(block);

  return [block];
}

function createRenderablePage(
  sourcePage: ReportDocumentPage,
  blocks: ReportDocumentBlock[],
  physicalPageIndex: number,
): ReportDocumentRenderablePage {
  return {
    ...sourcePage,
    id:
      physicalPageIndex === 0
        ? sourcePage.id
        : `${sourcePage.id}-a4-${physicalPageIndex + 1}`,
    sourcePageId: sourcePage.id,
    physicalPageIndex,
    isContinuation: physicalPageIndex > 0,
    title:
      physicalPageIndex === 0
        ? sourcePage.title
        : `${sourcePage.title || "صفحة"} ${physicalPageIndex + 1}`,
    blocks,
  };
}

function paginateLogicalPage(sourcePage: ReportDocumentPage) {
  const blocks = sortByOrder(sourcePage.blocks).flatMap(splitLargeBlock);
  const pages: ReportDocumentRenderablePage[] = [];

  let currentBlocks: ReportDocumentBlock[] = [];
  let currentHeight = 0;

  function flushPage() {
    pages.push(createRenderablePage(sourcePage, currentBlocks, pages.length));
    currentBlocks = [];
    currentHeight = 0;
  }

  for (const block of blocks) {
    const height = estimateBlockHeight(block);

    if (currentBlocks.length > 0 && currentHeight + height > A4_CONTENT_CAPACITY) {
      flushPage();
    }

    currentBlocks.push(block);
    currentHeight += Math.min(height, A4_CONTENT_CAPACITY);
  }

  if (currentBlocks.length > 0 || pages.length === 0) {
    flushPage();
  }

  return pages;
}

export function paginateReportDocumentDraftForA4(
  draft: ReportDocumentDraft,
): ReportDocumentRenderablePage[] {
  return sortByOrder(draft.pages).flatMap(paginateLogicalPage);
}