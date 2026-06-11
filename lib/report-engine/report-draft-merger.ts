import type {
  ReportDraftAdjustments,
  SmartReportCustomBlock,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

function normalizeValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";

  return String(value);
}

function applyFieldAdjustments(
  fields: SmartReportPayload["primaryFields"],
  adjustments: Array<{ key: string; value: string }> | undefined,
) {
  if (!adjustments?.length) return fields;

  return fields.map((field) => {
    const override = adjustments.find((item) => item.key === field.key);

    return override ? { ...field, value: override.value } : field;
  });
}

function normalizeCustomBlocks(
  blocks: SmartReportCustomBlock[] | undefined,
): SmartReportCustomBlock[] {
  return (blocks || [])
    .map((block) => ({
      id: block.id,
      type: block.type,
      title: block.title.trim(),
      body: block.body.trim(),
      targetPageIndex:
        typeof block.targetPageIndex === "number"
          ? block.targetPageIndex
          : undefined,
    }))
    .filter((block) => block.title || block.body);
}

function getChangedFields(
  originalFields: SmartReportPayload["primaryFields"],
  editedFields: SmartReportPayload["primaryFields"],
) {
  return editedFields
    .filter((field) => {
      const original = originalFields.find((item) => item.key === field.key);

      return (
        original &&
        normalizeValue(original.value) !== normalizeValue(field.value)
      );
    })
    .map((field) => ({
      key: field.key,
      value: normalizeValue(field.value),
    }));
}

export function applyReportDraftAdjustments(
  basePayload: SmartReportPayload,
  adjustments: ReportDraftAdjustments | null | undefined,
): SmartReportPayload {
  if (!adjustments) return basePayload;

  const nextPayload: SmartReportPayload = {
    ...basePayload,
    ...(adjustments.title !== undefined ? { title: adjustments.title } : {}),
    ...(adjustments.evidenceConfig !== undefined
      ? { evidenceConfig: adjustments.evidenceConfig }
      : {}),
    ...(adjustments.customBlocks !== undefined
      ? { customBlocks: normalizeCustomBlocks(adjustments.customBlocks) }
      : {}),
    caseInfo: {
      ...basePayload.caseInfo,
      ...(adjustments.title !== undefined ? { title: adjustments.title } : {}),
      ...(adjustments.caseInfo?.issuedAt !== undefined
        ? { issuedAt: adjustments.caseInfo.issuedAt }
        : {}),
      ...(adjustments.caseInfo?.issuedBy !== undefined
        ? { issuedBy: adjustments.caseInfo.issuedBy }
        : {}),
    },
    narrative: {
      ...basePayload.narrative,
      ...(adjustments.narrative?.title !== undefined
        ? { title: adjustments.narrative.title }
        : {}),
      ...(adjustments.narrative?.body !== undefined
        ? { body: adjustments.narrative.body }
        : {}),
    },
    primaryFields: applyFieldAdjustments(
      basePayload.primaryFields,
      adjustments.primaryFields,
    ),
    detailFields: applyFieldAdjustments(
      basePayload.detailFields,
      adjustments.detailFields,
    ),
  };

  return nextPayload;
}

export function computeReportDraftAdjustments(
  original: SmartReportPayload,
  edited: SmartReportPayload,
): ReportDraftAdjustments {
  const adjustments: ReportDraftAdjustments = {};

  if (edited.title !== original.title) {
    adjustments.title = edited.title;
  }

  if (edited.narrative.title !== original.narrative.title) {
    adjustments.narrative = {
      ...adjustments.narrative,
      title: edited.narrative.title,
    };
  }

  if (edited.narrative.body !== original.narrative.body) {
    adjustments.narrative = {
      ...adjustments.narrative,
      body: edited.narrative.body,
    };
  }

  const primaryFields = getChangedFields(
    original.primaryFields,
    edited.primaryFields,
  );

  if (primaryFields.length > 0) {
    adjustments.primaryFields = primaryFields;
  }

  const detailFields = getChangedFields(
    original.detailFields,
    edited.detailFields,
  );

  if (detailFields.length > 0) {
    adjustments.detailFields = detailFields;
  }

  if (edited.caseInfo.issuedAt !== original.caseInfo.issuedAt) {
    adjustments.caseInfo = {
      ...adjustments.caseInfo,
      issuedAt: edited.caseInfo.issuedAt,
    };
  }

  if (edited.caseInfo.issuedBy !== original.caseInfo.issuedBy) {
    adjustments.caseInfo = {
      ...adjustments.caseInfo,
      issuedBy: edited.caseInfo.issuedBy,
    };
  }

  if (
    JSON.stringify(original.customBlocks || []) !==
    JSON.stringify(edited.customBlocks || [])
  ) {
    adjustments.customBlocks = normalizeCustomBlocks(edited.customBlocks);
  }

  return adjustments;
}