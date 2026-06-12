import type {
  ReportDocumentBlock,
  ReportDocumentDraft,
  ReportTableBlock,
} from "@/lib/report-engine/document-draft/report-document-types";
import { sortByOrder } from "@/lib/report-engine/document-draft/report-document-utils";
import { computeReportDraftAdjustments } from "@/lib/report-engine/report-draft-merger";
import type {
  ReportDraftAdjustments,
  SmartReportCustomBlock,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

function isUserContentBlock(block: ReportDocumentBlock) {
  return (
    block.type === "PARAGRAPH" ||
    block.type === "BULLET_LIST" ||
    block.type === "TABLE"
  );
}

function tableBlockToCustomBlock(block: ReportTableBlock): SmartReportCustomBlock {
  return {
    id: block.id,
    type: "TABLE",
    title: block.title || "جدول",
    body: "",
    order: block.order,
    table: {
      settings: block.settings,
      columns: block.columns,
      rows: block.rows,
    },
  };
}

function blockToCustomBlock(block: ReportDocumentBlock): SmartReportCustomBlock | null {
  if (block.type === "PARAGRAPH") {
    return {
      id: block.id,
      type: "PARAGRAPH",
      title: block.title || "",
      body: block.body || "",
      order: block.order,
    };
  }

  if (block.type === "BULLET_LIST") {
    return {
      id: block.id,
      type: "BULLET_LIST",
      title: block.title || "",
      body: block.body || "",
      order: block.order,
    };
  }

  if (block.type === "TABLE") {
    return tableBlockToCustomBlock(block);
  }

  return null;
}

export function serializeReportDocumentDraftToPayload(
  draft: ReportDocumentDraft,
): SmartReportPayload {
  const payload: SmartReportPayload = JSON.parse(JSON.stringify(draft.payload));

  const allBlocks = sortByOrder(
    draft.pages.flatMap((page) => page.blocks),
  );

  const narrativeBlock = allBlocks.find((block) => block.type === "NARRATIVE");
  const evidenceBlock = allBlocks.find((block) => block.type === "EVIDENCE");

  const customBlocks = allBlocks
    .filter(isUserContentBlock)
    .map(blockToCustomBlock)
    .filter((block): block is SmartReportCustomBlock => Boolean(block))
    .filter((block) => {
      if (block.type === "TABLE") return Boolean(block.table);
      return Boolean(block.title.trim() || block.body.trim());
    });

  payload.title = draft.title || payload.title;
  payload.caseInfo = {
    ...payload.caseInfo,
    title: draft.title || payload.caseInfo.title,
  };

  if (narrativeBlock?.type === "NARRATIVE") {
    payload.narrative = {
      title: narrativeBlock.title || "وصف التنفيذ",
      body: narrativeBlock.body || "",
    };
  }

  if (evidenceBlock?.type === "EVIDENCE") {
    payload.evidence = {
      layout: payload.evidence.layout,
      items: evidenceBlock.evidenceItems,
    };
  }

  payload.evidenceConfig = draft.evidenceConfig;
  payload.customBlocks = customBlocks;

  return payload;
}

export function computeReportDocumentDraftAdjustments(
  originalPayload: SmartReportPayload,
  draft: ReportDocumentDraft,
): ReportDraftAdjustments {
  const editedPayload = serializeReportDocumentDraftToPayload(draft);

  return {
    ...computeReportDraftAdjustments(originalPayload, editedPayload),
    evidenceConfig: draft.evidenceConfig,
    customBlocks: editedPayload.customBlocks || [],
  };
}