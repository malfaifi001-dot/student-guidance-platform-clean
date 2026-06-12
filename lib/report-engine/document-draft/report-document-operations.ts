import type { ReportEvidenceConfig } from "@/lib/report-engine/smart-report-types";
import type {
  ReportBulletListBlock,
  ReportDocumentBlock,
  ReportDocumentBlockInsertType,
  ReportDocumentDraft,
  ReportDocumentPage,
  ReportParagraphBlock,
  ReportTableBlock,
} from "@/lib/report-engine/document-draft/report-document-types";
import {
  createReportDocumentId,
  getOrderBetween,
  sortByOrder,
} from "@/lib/report-engine/document-draft/report-document-utils";
import { createDefaultReportTableBlock } from "@/lib/report-engine/document-draft/report-table-utils";
import { applyReportSignaturePolicy } from "@/lib/report-engine/document-draft/report-signature-policy";

function getPageOrFirst(draft: ReportDocumentDraft, pageId: string) {
  return (
    draft.pages.find((page) => page.id === pageId) ||
    draft.pages[0] ||
    null
  );
}

function createParagraphBlock(order: number): ReportParagraphBlock {
  return {
    id: createReportDocumentId("paragraph"),
    type: "PARAGRAPH",
    title: "عنوان الفقرة",
    body: "اكتب نص الفقرة هنا.",
    order,
    source: "USER",
    locked: false,
  };
}

function createBulletListBlock(order: number): ReportBulletListBlock {
  return {
    id: createReportDocumentId("bullet"),
    type: "BULLET_LIST",
    title: "قائمة نقاط",
    body: "النقطة الأولى\nالنقطة الثانية\nالنقطة الثالثة",
    order,
    source: "USER",
    locked: false,
  };
}

function createBlockByType(
  type: ReportDocumentBlockInsertType,
  order: number,
): ReportDocumentBlock {
  if (type === "TABLE") return createDefaultReportTableBlock(order);
  if (type === "BULLET_LIST") return createBulletListBlock(order);

  return createParagraphBlock(order);
}

function getInsertOrderAfter(
  blocks: ReportDocumentBlock[],
  afterBlockId?: string | null,
) {
  const sortedBlocks = sortByOrder(blocks);

  if (!afterBlockId) {
    const lastOrder = sortedBlocks.at(-1)?.order ?? null;

    return getOrderBetween(lastOrder, null);
  }

  const currentIndex = sortedBlocks.findIndex((block) => block.id === afterBlockId);
  const previousOrder =
    currentIndex >= 0 ? sortedBlocks[currentIndex].order : sortedBlocks.at(-1)?.order ?? null;
  const nextOrder =
    currentIndex >= 0 && currentIndex < sortedBlocks.length - 1
      ? sortedBlocks[currentIndex + 1].order
      : null;

  return getOrderBetween(previousOrder, nextOrder);
}

export function addReportDocumentPageAfter(
  draft: ReportDocumentDraft,
  pageId: string,
): ReportDocumentDraft {
  const sortedPages = sortByOrder(draft.pages);
  const currentIndex = sortedPages.findIndex((page) => page.id === pageId);
  const insertIndex = currentIndex >= 0 ? currentIndex + 1 : sortedPages.length;
  const previousOrder =
    insertIndex > 0 ? sortedPages[insertIndex - 1]?.order ?? null : null;
  const nextOrder =
    insertIndex < sortedPages.length ? sortedPages[insertIndex]?.order ?? null : null;

  const page: ReportDocumentPage = {
    id: createReportDocumentId("page"),
    title: `صفحة ${sortedPages.length + 1}`,
    order: getOrderBetween(previousOrder, nextOrder),
    kind: "MANUAL",
    blocks: [],
  };

  return applyReportSignaturePolicy({
    ...draft,
    pages: sortByOrder([...draft.pages, page]),
    updatedAt: new Date().toISOString(),
  });
}

export function removeReportDocumentPage(
  draft: ReportDocumentDraft,
  pageId: string,
): ReportDocumentDraft {
  const page = draft.pages.find((item) => item.id === pageId);

  if (!page || page.kind !== "MANUAL") return draft;

  return applyReportSignaturePolicy({
    ...draft,
    pages: draft.pages.filter((item) => item.id !== pageId),
    updatedAt: new Date().toISOString(),
  });
}

export function moveReportDocumentPage(
  draft: ReportDocumentDraft,
  pageId: string,
  direction: "previous" | "next",
): ReportDocumentDraft {
  const sortedPages = sortByOrder(draft.pages);
  const currentIndex = sortedPages.findIndex((page) => page.id === pageId);

  if (currentIndex < 0) return draft;

  const targetIndex = direction === "previous" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= sortedPages.length) return draft;

  const reordered = [...sortedPages];
  const [page] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, page);

  const nextPages = reordered.map((item, index) => ({
    ...item,
    order: (index + 1) * 1000,
  }));

  return applyReportSignaturePolicy({
    ...draft,
    pages: nextPages,
    updatedAt: new Date().toISOString(),
  });
}

export function addReportDocumentBlock(
  draft: ReportDocumentDraft,
  pageId: string,
  type: ReportDocumentBlockInsertType,
  afterBlockId?: string | null,
): {
  draft: ReportDocumentDraft;
  blockId: string;
} {
  const page = getPageOrFirst(draft, pageId);

  if (!page) {
    return { draft, blockId: "" };
  }

  const order = getInsertOrderAfter(page.blocks, afterBlockId);
  const block = createBlockByType(type, order);

  const nextDraft = applyReportSignaturePolicy({
    ...draft,
    pages: draft.pages.map((item) =>
      item.id === page.id
        ? {
            ...item,
            blocks: sortByOrder([...item.blocks, block]),
          }
        : item,
    ),
    updatedAt: new Date().toISOString(),
  });

  return {
    draft: nextDraft,
    blockId: block.id,
  };
}

export function updateReportDocumentBlock(
  draft: ReportDocumentDraft,
  blockId: string,
  patch: Partial<ReportDocumentBlock>,
): ReportDocumentDraft {
  return applyReportSignaturePolicy({
    ...draft,
    pages: draft.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) =>
        block.id === blockId ? ({ ...block, ...patch } as ReportDocumentBlock) : block,
      ),
    })),
    updatedAt: new Date().toISOString(),
  });
}

export function updateReportDocumentTableBlock(
  draft: ReportDocumentDraft,
  table: ReportTableBlock,
): ReportDocumentDraft {
  return updateReportDocumentBlock(draft, table.id, table);
}

export function removeReportDocumentBlock(
  draft: ReportDocumentDraft,
  blockId: string,
): ReportDocumentDraft {
  return applyReportSignaturePolicy({
    ...draft,
    pages: draft.pages.map((page) => ({
      ...page,
      blocks: page.blocks.filter((block) => block.id !== blockId || block.locked),
    })),
    updatedAt: new Date().toISOString(),
  });
}

export function moveReportDocumentBlock(
  draft: ReportDocumentDraft,
  pageId: string,
  blockId: string,
  direction: "previous" | "next",
): ReportDocumentDraft {
  const page = getPageOrFirst(draft, pageId);

  if (!page) return draft;

  const movableBlocks = sortByOrder(page.blocks);
  const currentIndex = movableBlocks.findIndex((block) => block.id === blockId);

  if (currentIndex < 0) return draft;

  const targetIndex = direction === "previous" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= movableBlocks.length) return draft;

  const reordered = [...movableBlocks];
  const [block] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, block);

  const nextBlocks = reordered.map((item, index) => ({
    ...item,
    order: (index + 1) * 100,
  })) as ReportDocumentBlock[];

  return applyReportSignaturePolicy({
    ...draft,
    pages: draft.pages.map((item) =>
      item.id === page.id ? { ...item, blocks: nextBlocks } : item,
    ),
    updatedAt: new Date().toISOString(),
  });
}

export function ensureReportDocumentSystemBlocks(
  draft: ReportDocumentDraft,
): ReportDocumentDraft {
  const evidenceItems = draft.payload.evidence?.items || [];
  const hasEvidenceBlock = draft.pages.some((page) =>
    page.blocks.some((block) => block.type === "EVIDENCE"),
  );

  if (evidenceItems.length === 0) {
    return applyReportSignaturePolicy(draft);
  }

  const evidenceConfig =
    draft.evidenceConfig ||
    draft.payload.evidenceConfig || {
      visible: true,
      itemsPerPage: 2,
      showCaptions: false,
      imageSize: "small-squares" as const,
    };

  if (hasEvidenceBlock) {
    return applyReportSignaturePolicy({
      ...draft,
      evidenceConfig,
      payload: {
        ...draft.payload,
        evidenceConfig,
      },
      pages: draft.pages.map((page) => ({
        ...page,
        blocks: page.blocks.map((block) =>
          block.type === "EVIDENCE"
            ? {
                ...block,
                title: block.title || "الشواهد",
                evidenceItems,
                evidenceConfig,
              }
            : block,
        ),
      })),
      updatedAt: new Date().toISOString(),
    });
  }

  const nextPages = draft.pages.length > 0 ? draft.pages : [
    {
      id: "page-auto-1",
      title: draft.title || "التقرير",
      order: 1000,
      kind: "AUTO" as const,
      blocks: [],
    },
  ];

  const firstPage = nextPages[0];

  return applyReportSignaturePolicy({
    ...draft,
    evidenceConfig,
    payload: {
      ...draft.payload,
      evidenceConfig,
    },
    pages: nextPages.map((page) =>
      page.id === firstPage.id
        ? {
            ...page,
            blocks: [
              ...page.blocks.filter((block) => block.type !== "SIGNATURES"),
              {
                id: "system-evidence",
                type: "EVIDENCE" as const,
                title: "الشواهد",
                evidenceItems,
                evidenceConfig,
                order: 800,
                source: "SYSTEM" as const,
                locked: false,
              },
            ],
          }
        : page,
    ),
    updatedAt: new Date().toISOString(),
  });
}

export function updateReportDocumentEvidenceConfig(
  draft: ReportDocumentDraft,
  evidenceConfig: ReportEvidenceConfig,
): ReportDocumentDraft {
  return ensureReportDocumentSystemBlocks({
    ...draft,
    evidenceConfig,
    payload: {
      ...draft.payload,
      evidenceConfig,
    },
    pages: draft.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) =>
        block.type === "EVIDENCE"
          ? {
              ...block,
              evidenceConfig,
            }
          : block,
      ),
    })),
    updatedAt: new Date().toISOString(),
  });
}

export function updateReportDocumentTitle(
  draft: ReportDocumentDraft,
  title: string,
): ReportDocumentDraft {
  const normalizedTitle = title.trim() || "التقرير";

  return applyReportSignaturePolicy({
    ...draft,
    title: normalizedTitle,
    payload: {
      ...draft.payload,
      title: normalizedTitle,
      caseInfo: {
        ...draft.payload.caseInfo,
        title: normalizedTitle,
      },
    },
    pages: draft.pages.map((page, index) =>
      page.kind === "AUTO" && index === 0
        ? {
            ...page,
            title: normalizedTitle,
          }
        : page,
    ),
    updatedAt: new Date().toISOString(),
  });
}

export function removeReportDocumentMetaField(
  draft: ReportDocumentDraft,
  fieldKey: string,
): ReportDocumentDraft {
  return applyReportSignaturePolicy({
    ...draft,
    payload: {
      ...draft.payload,
      primaryFields: draft.payload.primaryFields.filter(
        (field) => field.key !== fieldKey,
      ),
      detailFields: draft.payload.detailFields.filter(
        (field) => field.key !== fieldKey,
      ),
    },
    pages: draft.pages.map((page) => ({
      ...page,
      blocks: page.blocks
        .map((block) =>
          block.type === "META_FIELDS"
            ? {
                ...block,
                fields: block.fields.filter((field) => field.key !== fieldKey),
              }
            : block,
        )
        .filter(
          (block) => block.type !== "META_FIELDS" || block.fields.length > 0,
        ),
    })),
    updatedAt: new Date().toISOString(),
  });
}

export function updateReportDocumentMetaField(
  draft: ReportDocumentDraft,
  fieldKey: string,
  patch: {
    label?: string;
    value?: string;
  },
): ReportDocumentDraft {
  function updateField<T extends { key: string; label: string; value: unknown }>(
    field: T,
  ): T {
    if (field.key !== fieldKey) return field;

    return {
      ...field,
      label: patch.label ?? field.label,
      value: patch.value ?? field.value,
    };
  }

  return applyReportSignaturePolicy({
    ...draft,
    payload: {
      ...draft.payload,
      primaryFields: draft.payload.primaryFields.map(updateField),
      detailFields: draft.payload.detailFields.map(updateField),
    },
    pages: draft.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) =>
        block.type === "META_FIELDS"
          ? {
              ...block,
              fields: block.fields.map(updateField),
            }
          : block,
      ),
    })),
    updatedAt: new Date().toISOString(),
  });
}