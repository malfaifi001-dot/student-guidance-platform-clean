import type { ReportBlock } from "@/lib/report-engine/report-block-types";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function hasValue(value: unknown) {
  return cleanText(value).length > 0;
}

function estimatedTextHeight(title: string | undefined, body: string | undefined) {
  const titleLength = cleanText(title).length;
  const bodyLength = cleanText(body).length;

  if (titleLength + bodyLength <= 0) return 0;

  const titleHeight = titleLength > 0 ? 14 : 0;
  const lineCount = Math.max(1, Math.ceil(bodyLength / 34));

  return 22 + titleHeight + lineCount * 10;
}

function estimatedFieldsHeight(count: number) {
  if (count <= 0) return 0;

  return 14 + Math.ceil(count / 4) * 14;
}

export function buildReportBlocks(payload: SmartReportPayload): ReportBlock[] {
  const primaryFields = payload.primaryFields.filter((field) =>
    hasValue(field.value),
  );

  const detailFields = payload.detailFields.filter((field) =>
    hasValue(field.value),
  );

  const allFields = [...primaryFields, ...detailFields];

  const blocks: ReportBlock[] = [
    {
      id: "header",
      type: "HEADER",
      placement: "LOCKED",
      estimatedHeight: 0,
      movable: false,
      editable: false,
      order: 0,
    },
  ];

  if (allFields.length > 0) {
    blocks.push({
      id: "meta-fields",
      type: "META_FIELDS",
      fields: allFields,
      placement: "CONTENT",
      estimatedHeight: estimatedFieldsHeight(allFields.length),
      movable: false,
      editable: true,
      order: 100,
    });
  }

  const isSchoolBroadcast =
    payload.service.slug === "activity-programs-school-broadcast";

  if (!isSchoolBroadcast && hasValue(payload.narrative?.body)) {
    blocks.push({
      id: "narrative",
      type: "NARRATIVE",
      title: payload.narrative.title || "وصف التنفيذ",
      body: payload.narrative.body,
      placement: "CONTENT",
      estimatedHeight: estimatedTextHeight(
        payload.narrative.title,
        payload.narrative.body,
      ),
      movable: false,
      editable: true,
      order: 200,
    });
  }

  for (const [index, customBlock] of (payload.customBlocks || []).entries()) {
    if (!hasValue(customBlock.title) && !hasValue(customBlock.body)) continue;

    blocks.push({
      id: `custom-${customBlock.id}`,
      type:
        customBlock.type === "BULLET_LIST"
          ? "CUSTOM_BULLET_LIST"
          : "CUSTOM_PARAGRAPH",
      title: customBlock.title,
      body: customBlock.body,
      placement: "CONTENT",
      estimatedHeight: estimatedTextHeight(
        customBlock.title,
        customBlock.body,
      ),
      movable: true,
      editable: true,
      sourceCustomBlockId: customBlock.id,
      targetPageIndex: customBlock.targetPageIndex,
      targetZone: customBlock.targetZone,
      order: customBlock.order ?? 300 + index * 10,
    });
  }

  if (payload.evidence.items.length > 0) {
    blocks.push({
      id: "evidence",
      type: "EVIDENCE_GRID",
      evidenceItems: payload.evidence.items,
      placement: "CONTENT",
      estimatedHeight: 90,
      movable: false,
      editable: true,
      order: 800,
    });
  }

  if (payload.signatures.length > 0) {
    blocks.push({
      id: "signatures",
      type: "SIGNATURES",
      signatures: payload.signatures,
      placement: "END",
      estimatedHeight: 34,
      movable: false,
      editable: false,
      order: 900,
    });
  }

  blocks.push({
    id: "footer",
    type: "FOOTER",
    placement: "LOCKED",
    estimatedHeight: 0,
    movable: false,
    editable: false,
    order: 1000,
  });

  return blocks;
}
