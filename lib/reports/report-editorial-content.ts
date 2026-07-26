export type EditorialMeta = {
  editedAfterApproval?: boolean;
  lastEditedAfterApprovalAt?: string;
  lastEditedAfterApprovalById?: string;
};

export function parseEditorialContent(value: string) {
  const text = String(value ?? "");

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Legacy text is retained below instead of being discarded.
  }

  return text
    ? {
        version: 1,
        type: "LEGACY_EDITORIAL_CONTENT",
        legacyContent: text,
      }
    : {};
}

export function addApprovedEditorialMeta(input: {
  editableContent: string;
  actorUserId: string;
  editedAt: string;
}) {
  const content = parseEditorialContent(input.editableContent);
  const existingMeta =
    content.editorialMeta &&
    typeof content.editorialMeta === "object" &&
    !Array.isArray(content.editorialMeta)
      ? (content.editorialMeta as Record<string, unknown>)
      : {};

  return JSON.stringify(
    {
      ...content,
      editorialMeta: {
        ...existingMeta,
        editedAfterApproval: true,
        lastEditedAfterApprovalAt: input.editedAt,
        lastEditedAfterApprovalById: input.actorUserId,
      },
    },
    null,
    2,
  );
}
