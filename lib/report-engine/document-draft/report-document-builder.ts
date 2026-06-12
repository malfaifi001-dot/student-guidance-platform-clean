import type {
  ReportBulletListBlock,
  ReportDocumentBlock,
  ReportDocumentDraft,
  ReportDocumentPage,
  ReportEvidenceBlock,
  ReportMetaFieldsBlock,
  ReportNarrativeBlock,
  ReportParagraphBlock,
  ReportTableBlock,
} from "@/lib/report-engine/document-draft/report-document-types";
import {
  createReportDocumentId,
  sortByOrder,
} from "@/lib/report-engine/document-draft/report-document-utils";
import { applyReportSignaturePolicy } from "@/lib/report-engine/document-draft/report-signature-policy";
import type {
  ReportEvidenceConfig,
  SmartReportCustomBlock,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;

  if (Array.isArray(value)) {
    return value.some((item) => String(item ?? "").trim().length > 0);
  }

  return String(value).trim().length > 0;
}

export function getDefaultReportEvidenceConfig(
  payload: SmartReportPayload,
): ReportEvidenceConfig {
  return (
    payload.evidenceConfig || {
      visible: true,
      itemsPerPage: 2,
      showCaptions: false,
      imageSize: "small-squares",
    }
  );
}

function buildMetaFieldsBlock(payload: SmartReportPayload): ReportMetaFieldsBlock | null {
  const fields = [...payload.primaryFields, ...payload.detailFields].filter((field) =>
    hasValue(field.value),
  );

  if (fields.length === 0) return null;

  return {
    id: "system-meta-fields",
    type: "META_FIELDS",
    title: "بيانات التقرير",
    fields,
    order: 100,
    source: "SYSTEM",
    locked: true,
  };
}

function buildNarrativeBlock(payload: SmartReportPayload): ReportNarrativeBlock | null {
  if (!hasValue(payload.narrative.body)) return null;

  return {
    id: "system-narrative",
    type: "NARRATIVE",
    title: payload.narrative.title || "وصف التنفيذ",
    body: payload.narrative.body,
    order: 200,
    source: "SYSTEM",
    locked: false,
  };
}

function buildCustomTextBlock(
  customBlock: SmartReportCustomBlock,
  index: number,
): ReportParagraphBlock | ReportBulletListBlock | ReportTableBlock | null {
  if (
    customBlock.type !== "PARAGRAPH" &&
    customBlock.type !== "BULLET_LIST" &&
    customBlock.type !== "TABLE"
  ) {
    return null;
  }

  if (customBlock.type === "TABLE") {
    const table = customBlock.table;

    if (!table) return null;

    return {
      id: customBlock.id || createReportDocumentId("table"),
      type: "TABLE",
      title: customBlock.title || "جدول",
      order: customBlock.order ?? 300 + index * 100,
      source: "USER",
      locked: false,
      settings: table.settings,
      columns: table.columns,
      rows: table.rows,
    };
  }

  if (!hasValue(customBlock.title) && !hasValue(customBlock.body)) {
    return null;
  }

  if (customBlock.type === "BULLET_LIST") {
    return {
      id: customBlock.id || createReportDocumentId("bullet"),
      type: "BULLET_LIST",
      title: customBlock.title || "قائمة نقاط",
      body: customBlock.body || "",
      order: customBlock.order ?? 300 + index * 100,
      source: "USER",
      locked: false,
    };
  }

  return {
    id: customBlock.id || createReportDocumentId("paragraph"),
    type: "PARAGRAPH",
    title: customBlock.title || "عنوان الفقرة",
    body: customBlock.body || "",
    order: customBlock.order ?? 300 + index * 100,
    source: "USER",
    locked: false,
  };
}

function buildEvidenceBlock(
  payload: SmartReportPayload,
  evidenceConfig: ReportEvidenceConfig,
): ReportEvidenceBlock | null {
  if (!payload.evidence.items.length) return null;

  return {
    id: "system-evidence",
    type: "EVIDENCE",
    title: "الشواهد",
    evidenceItems: payload.evidence.items,
    evidenceConfig,
    order: 800,
    source: "SYSTEM",
    locked: false,
  };
}

function buildInitialPage(
  payload: SmartReportPayload,
  evidenceConfig: ReportEvidenceConfig,
): ReportDocumentPage {
  const blocks: ReportDocumentBlock[] = [];

  const metaBlock = buildMetaFieldsBlock(payload);
  const narrativeBlock = buildNarrativeBlock(payload);
  const evidenceBlock = buildEvidenceBlock(payload, evidenceConfig);

  if (metaBlock) blocks.push(metaBlock);
  if (narrativeBlock) blocks.push(narrativeBlock);

  for (const [index, customBlock] of (payload.customBlocks || []).entries()) {
    const block = buildCustomTextBlock(customBlock, index);

    if (block) blocks.push(block);
  }

  if (evidenceBlock) blocks.push(evidenceBlock);

  return {
    id: "page-auto-1",
    title: payload.title || payload.caseInfo.title || "التقرير",
    order: 1000,
    kind: "AUTO",
    blocks: sortByOrder(blocks),
  };
}

export function buildReportDocumentDraftFromPayload({
  payload,
  variantId,
  evidenceConfig,
}: {
  payload: SmartReportPayload;
  variantId: string;
  evidenceConfig?: ReportEvidenceConfig;
}): ReportDocumentDraft {
  const normalizedEvidenceConfig =
    evidenceConfig || getDefaultReportEvidenceConfig(payload);

  const draft: ReportDocumentDraft = {
    id: createReportDocumentId("document"),
    caseId: payload.caseInfo.id,
    variantId,
    title: payload.title || payload.caseInfo.title || "التقرير",
    payload: {
      ...payload,
      evidenceConfig: normalizedEvidenceConfig,
    },
    evidenceConfig: normalizedEvidenceConfig,
    pages: [buildInitialPage(payload, normalizedEvidenceConfig)],
    updatedAt: new Date().toISOString(),
  };

  return applyReportSignaturePolicy(draft);
}

export function rebuildReportDocumentDraftPayload(
  draft: ReportDocumentDraft,
  payload: SmartReportPayload,
): ReportDocumentDraft {
  return applyReportSignaturePolicy({
    ...draft,
    title: payload.title || payload.caseInfo.title || draft.title,
    payload: {
      ...payload,
      evidenceConfig: draft.evidenceConfig,
    },
    updatedAt: new Date().toISOString(),
  });
}