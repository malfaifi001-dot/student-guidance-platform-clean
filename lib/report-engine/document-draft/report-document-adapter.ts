import type { ReportBlock } from "@/lib/report-engine/report-block-types";
import type {
  ReportDocumentBlock,
  ReportDocumentDraft,
  ReportDocumentPage,
} from "@/lib/report-engine/document-draft/report-document-types";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";

function mapDocumentBlockToLegacyBlock(block: ReportDocumentBlock): ReportBlock | null {
  if (block.type === "META_FIELDS") {
    return {
      id: block.id,
      type: "META_FIELDS",
      fields: block.fields,
      estimatedHeight: 40,
      placement: "CONTENT",
      movable: false,
      editable: true,
      order: block.order,
    };
  }

  if (block.type === "NARRATIVE") {
    return {
      id: block.id,
      type: "NARRATIVE",
      title: block.title || "وصف التنفيذ",
      body: block.body,
      estimatedHeight: 40,
      placement: "CONTENT",
      movable: false,
      editable: true,
      order: block.order,
    };
  }

  if (block.type === "PARAGRAPH") {
    return {
      id: block.id,
      type: "CUSTOM_PARAGRAPH",
      title: block.title || "",
      body: block.body,
      estimatedHeight: 34,
      placement: "CONTENT",
      movable: true,
      editable: true,
      sourceCustomBlockId: block.id,
      order: block.order,
    };
  }

  if (block.type === "BULLET_LIST") {
    return {
      id: block.id,
      type: "CUSTOM_BULLET_LIST",
      title: block.title || "",
      body: block.body,
      estimatedHeight: 34,
      placement: "CONTENT",
      movable: true,
      editable: true,
      sourceCustomBlockId: block.id,
      order: block.order,
    };
  }

  if (block.type === "EVIDENCE") {
    return {
      id: block.id,
      type: "EVIDENCE_GRID",
      title: block.title || "الشواهد",
      evidenceItems: block.evidenceItems,
      estimatedHeight: 90,
      placement: "CONTENT",
      movable: false,
      editable: true,
      order: block.order,
    };
  }

  if (block.type === "SIGNATURES") {
    return {
      id: block.id,
      type: "SIGNATURES",
      title: block.title || "الاعتمادات",
      signatures: block.signatures,
      estimatedHeight: 34,
      placement: "END",
      movable: false,
      editable: false,
      order: block.order,
    };
  }

  if (block.type === "TABLE") {
    return {
      id: block.id,
      type: "CUSTOM_PARAGRAPH",
      title: block.title || "جدول",
      body: "سيتم عرض الجدول في الكود 4 من إعادة البناء.",
      estimatedHeight: 34,
      placement: "CONTENT",
      movable: true,
      editable: true,
      sourceCustomBlockId: block.id,
      order: block.order,
    };
  }

  return null;
}

function buildPagePayload(
  draft: ReportDocumentDraft,
  page: ReportDocumentPage,
): SmartReportPayload {
  const payload = JSON.parse(JSON.stringify(draft.payload)) as SmartReportPayload;
  const narrativeBlock = page.blocks.find((block) => block.type === "NARRATIVE");
  const evidenceBlock = page.blocks.find((block) => block.type === "EVIDENCE");
  const signaturesBlock = page.blocks.find((block) => block.type === "SIGNATURES");

  payload.title = page.title || draft.title;
  payload.caseInfo = {
    ...payload.caseInfo,
    title: page.title || draft.title,
  };

  payload.primaryFields = page.blocks.some((block) => block.type === "META_FIELDS")
    ? payload.primaryFields
    : [];
  payload.detailFields = page.blocks.some((block) => block.type === "META_FIELDS")
    ? payload.detailFields
    : [];

  payload.narrative =
    narrativeBlock && narrativeBlock.type === "NARRATIVE"
      ? {
          title: narrativeBlock.title || "وصف التنفيذ",
          body: narrativeBlock.body,
        }
      : {
          title: "",
          body: "",
        };

  payload.evidence =
    evidenceBlock && evidenceBlock.type === "EVIDENCE"
      ? {
          layout: payload.evidence.layout,
          items: evidenceBlock.evidenceItems,
        }
      : {
          layout: payload.evidence.layout,
          items: [],
        };

  payload.signatures =
    signaturesBlock && signaturesBlock.type === "SIGNATURES"
      ? signaturesBlock.signatures
      : [];

  payload.evidenceConfig = draft.evidenceConfig;

  return payload;
}

export function mapReportDocumentDraftToRenderablePages(draft: ReportDocumentDraft) {
  return draft.pages.map((page, index) => ({
    key: page.id,
    title: page.title || `صفحة ${index + 1}`,
    index,
    blocks: page.blocks
      .map(mapDocumentBlockToLegacyBlock)
      .filter((block): block is ReportBlock => Boolean(block)),
    payload: buildPagePayload(draft, page),
  }));
}