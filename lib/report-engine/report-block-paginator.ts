import type {
  ReportBlock,
  ReportPage,
  ReportPaginationOptions,
} from "@/lib/report-engine/report-block-types";
import type {
  ReportEvidenceConfig,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

const DEFAULT_PAGE_CAPACITY = 210;
const MAX_TEXT_BLOCK_HEIGHT = 92;
const APPROX_CHARS_PER_TEXT_PAGE = 520;

function clonePayload(payload: SmartReportPayload): SmartReportPayload {
  return JSON.parse(JSON.stringify(payload));
}

function chunkArray<T>(items: T[], size: number) {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

function splitText(value: string, maxLength: number) {
  const text = String(value || "").trim();

  if (text.length <= maxLength) return text ? [text] : [];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    let cutIndex = remaining.lastIndexOf(" ", maxLength);

    if (cutIndex < Math.floor(maxLength * 0.6)) {
      cutIndex = maxLength;
    }

    chunks.push(remaining.slice(0, cutIndex).trim());
    remaining = remaining.slice(cutIndex).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

function estimateTextHeight(title: string | undefined, body: string | undefined) {
  const titleLength = String(title || "").trim().length;
  const bodyLength = String(body || "").trim().length;
  const titleHeight = titleLength > 0 ? 10 : 0;
  const lineCount = Math.max(1, Math.ceil(bodyLength / 58));

  return 16 + titleHeight + lineCount * 7;
}

function getEvidenceBlockHeight(config?: ReportEvidenceConfig) {
  const itemsPerPage = config?.itemsPerPage ?? 2;

  if (itemsPerPage === 1) return 165;
  if (itemsPerPage === 2) return 108;

  return 84;
}

function getPageTitle(baseTitle: string, index: number) {
  return index === 0 ? baseTitle : `${baseTitle} ${index + 1}`;
}

function isCustomBlock(block: ReportBlock) {
  return (
    block.type === "CUSTOM_PARAGRAPH" ||
    block.type === "CUSTOM_BULLET_LIST"
  );
}

function getPageHeight(blocks: ReportBlock[]) {
  return blocks.reduce((total, block) => total + block.estimatedHeight, 0);
}

function expandEvidenceBlocks(
  block: ReportBlock,
  evidenceConfig?: ReportEvidenceConfig,
): ReportBlock[] {
  const items = block.evidenceItems || [];
  const visible = evidenceConfig?.visible ?? true;

  if (!visible || items.length === 0) return [];

  const itemsPerPage = evidenceConfig?.itemsPerPage ?? 2;
  const chunks = chunkArray(items, itemsPerPage);

  return chunks.map((chunk, index) => ({
    ...block,
    id: `${block.id}-${index + 1}`,
    evidenceItems: chunk,
    estimatedHeight: getEvidenceBlockHeight(evidenceConfig),
  }));
}

function splitOversizedTextBlock(block: ReportBlock): ReportBlock[] {
  if (!isCustomBlock(block)) return [block];

  const body = String(block.body || "").trim();
  const title = String(block.title || "").trim();
  const chunks = splitText(body, APPROX_CHARS_PER_TEXT_PAGE);

  if (chunks.length <= 1 && block.estimatedHeight <= MAX_TEXT_BLOCK_HEIGHT) {
    return [block];
  }

  if (chunks.length === 0) {
    return [block];
  }

  return chunks.map((chunk, index) => ({
    ...block,
    id: `${block.id}-part-${index + 1}`,
    title: index === 0 ? title : `${title || "فقرة"} - تابع`,
    body: chunk,
    estimatedHeight: Math.min(
      MAX_TEXT_BLOCK_HEIGHT,
      estimateTextHeight(index === 0 ? title : `${title || "فقرة"} - تابع`, chunk),
    ),
  }));
}

function normalizeContentBlock(
  block: ReportBlock,
  evidenceConfig?: ReportEvidenceConfig,
): ReportBlock[] {
  if (block.type === "EVIDENCE_GRID") {
    return expandEvidenceBlocks(block, evidenceConfig);
  }

  return splitOversizedTextBlock(block);
}

function buildPayloadForPage(
  basePayload: SmartReportPayload,
  pageTitle: string,
  blocks: ReportBlock[],
  evidenceConfig?: ReportEvidenceConfig,
): SmartReportPayload {
  const payload = clonePayload(basePayload);

  const metaBlock = blocks.find((block) => block.type === "META_FIELDS");
  const narrativeBlock = blocks.find((block) => block.type === "NARRATIVE");
  const evidenceItems = blocks.flatMap((block) => block.evidenceItems || []);
  const signatures = blocks.flatMap((block) => block.signatures || []);

  const customBlocks = blocks
    .filter(isCustomBlock)
    .map((block) => ({
      id: block.sourceCustomBlockId || block.id,
      type:
        block.type === "CUSTOM_BULLET_LIST"
          ? ("BULLET_LIST" as const)
          : ("PARAGRAPH" as const),
      title: block.title || "",
      body: block.body || "",
      targetPageIndex: block.targetPageIndex,
    }));

  payload.title = pageTitle;
  payload.caseInfo = {
    ...payload.caseInfo,
    title: pageTitle,
  };

  payload.primaryFields = metaBlock ? payload.primaryFields : [];
  payload.detailFields = metaBlock ? payload.detailFields : [];

  payload.narrative = narrativeBlock
    ? {
        title: narrativeBlock.title || payload.narrative.title || "وصف التنفيذ",
        body: narrativeBlock.body || "",
      }
    : {
        title: "",
        body: "",
      };

  payload.customBlocks = customBlocks;
  payload.evidence = {
    layout: payload.evidence.layout,
    items: evidenceItems,
  };
  payload.signatures = signatures;
  payload.evidenceConfig = evidenceConfig;

  return payload;
}

function insertBlockInPageFlow(
  pages: ReportBlock[][],
  block: ReportBlock,
  targetPageIndex: number,
  pageCapacity: number,
) {
  while (pages.length <= targetPageIndex) {
    pages.push([]);
  }

  let pageIndex = targetPageIndex;

  while (true) {
    const targetPage = pages[pageIndex] || [];
    pages[pageIndex] = targetPage;

    const currentHeight = getPageHeight(targetPage);

    if (targetPage.length === 0 || currentHeight + block.estimatedHeight <= pageCapacity) {
      targetPage.push(block);
      return;
    }

    pageIndex++;

    if (!pages[pageIndex]) {
      pages[pageIndex] = [];
    }
  }
}

function insertAnchoredBlocks(
  pages: ReportBlock[][],
  anchoredBlocks: ReportBlock[],
  pageCapacity: number,
) {
  const nextPages = pages.length > 0 ? pages.map((page) => [...page]) : [[]];

  for (const block of anchoredBlocks) {
    const targetPageIndex =
      typeof block.targetPageIndex === "number" && block.targetPageIndex >= 0
        ? block.targetPageIndex
        : 0;

    const parts = splitOversizedTextBlock(block);

    for (const part of parts) {
      insertBlockInPageFlow(nextPages, part, targetPageIndex, pageCapacity);
    }
  }

  return nextPages;
}

export function paginateReportBlocks(
  payload: SmartReportPayload,
  blocks: ReportBlock[],
  options: ReportPaginationOptions = {},
): ReportPage[] {
  const pageCapacity = options.pageCapacity ?? DEFAULT_PAGE_CAPACITY;
  const evidenceConfig = options.evidenceConfig;
  const baseTitle = payload.title || payload.caseInfo.title || "التقرير";

  const anchoredCustomBlocks = blocks.filter(
    (block) => isCustomBlock(block) && typeof block.targetPageIndex === "number",
  );

  const normalContentBlocks = blocks
    .filter(
      (block) =>
        block.placement === "CONTENT" &&
        !(isCustomBlock(block) && typeof block.targetPageIndex === "number"),
    )
    .sort((a, b) => (a.order ?? 500) - (b.order ?? 500))
    .flatMap((block) => normalizeContentBlock(block, evidenceConfig));

  const endBlocks = blocks.filter((block) => block.placement === "END");

  const pages: ReportBlock[][] = [];
  let currentPage: ReportBlock[] = [];
  let currentHeight = 0;

  function closePage() {
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    currentPage = [];
    currentHeight = 0;
  }

  function addBlock(block: ReportBlock) {
    const blockHeight = Math.min(block.estimatedHeight, pageCapacity);

    if (
      currentPage.length > 0 &&
      currentHeight + blockHeight > pageCapacity
    ) {
      closePage();
    }

    currentPage.push({
      ...block,
      estimatedHeight: blockHeight,
    });
    currentHeight += blockHeight;
  }

  for (const block of normalContentBlocks) {
    addBlock(block);
  }

  closePage();

  const pagesWithAnchoredBlocks = insertAnchoredBlocks(
    pages.length > 0 ? pages : [[]],
    anchoredCustomBlocks,
    pageCapacity,
  );

  for (const signatureBlock of endBlocks) {
    let lastPage = pagesWithAnchoredBlocks[pagesWithAnchoredBlocks.length - 1];

    if (!lastPage) {
      lastPage = [];
      pagesWithAnchoredBlocks.push(lastPage);
    }

    const lastPageHeight = getPageHeight(lastPage);

    if (lastPage.length > 0 && lastPageHeight + signatureBlock.estimatedHeight <= pageCapacity) {
      lastPage.push(signatureBlock);
    } else {
      pagesWithAnchoredBlocks.push([signatureBlock]);
    }
  }

  return pagesWithAnchoredBlocks.map((pageBlocks, index) => {
    const title = getPageTitle(baseTitle, index);

    return {
      key: index === 0 ? "main" : `page-${index + 1}`,
      title,
      index,
      blocks: pageBlocks,
      payload: buildPayloadForPage(payload, title, pageBlocks, evidenceConfig),
    };
  });
}