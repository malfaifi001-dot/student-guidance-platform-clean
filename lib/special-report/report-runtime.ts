import { notFound } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import {
  isSpecialReportRepeaterFieldKey,
} from "@/lib/special-report/catalog";
import { SPECIAL_REPORT_SERVICE_SLUG } from "@/lib/special-report/types";

type SnapshotFieldMeta = {
  label?: string;
  isRepeater?: boolean;
};

function normalizeArrayValue(jsonValue: unknown) {
  if (!Array.isArray(jsonValue)) {
    return [];
  }

  return jsonValue
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function valueToText(
  value: string | null,
  jsonValue: unknown
) {
  const arrayValue = normalizeArrayValue(jsonValue);

  if (arrayValue.length > 0) {
    return arrayValue.join("\n");
  }

  if (value?.trim()) {
    return value.trim();
  }

  if (
    jsonValue &&
    typeof jsonValue === "object"
  ) {
    return JSON.stringify(jsonValue);
  }

  return "";
}

function getSnapshotWorkflowSource(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  const record = snapshot as Record<string, unknown>;

  if (Array.isArray(record.steps)) {
    return record as {
      steps: Array<{
        fields?: Array<{
          key?: string;
          label?: string;
          isRepeater?: boolean;
        }>;
      }>;
    };
  }

  if (
    record.workflow &&
    typeof record.workflow === "object" &&
    Array.isArray((record.workflow as { steps?: unknown[] }).steps)
  ) {
    return record.workflow as {
      steps: Array<{
        fields?: Array<{
          key?: string;
          label?: string;
          isRepeater?: boolean;
        }>;
      }>;
    };
  }

  if (
    record.runtimeWorkflow &&
    typeof record.runtimeWorkflow === "object" &&
    Array.isArray((record.runtimeWorkflow as { steps?: unknown[] }).steps)
  ) {
    return record.runtimeWorkflow as {
      steps: Array<{
        fields?: Array<{
          key?: string;
          label?: string;
          isRepeater?: boolean;
        }>;
      }>;
    };
  }

  return null;
}

function buildSnapshotFieldMeta(snapshot: unknown) {
  const snapshotSource = getSnapshotWorkflowSource(snapshot);

  if (!snapshotSource) {
    return new Map<string, SnapshotFieldMeta>();
  }

  return new Map<string, SnapshotFieldMeta>(
    snapshotSource.steps.flatMap((step) =>
      Array.isArray(step.fields)
        ? step.fields
            .filter((field) => typeof field?.key === "string")
            .map((field) => [
              String(field.key),
              {
                label:
                  typeof field.label === "string"
                    ? field.label
                    : undefined,
                isRepeater:
                  typeof field.isRepeater === "boolean"
                    ? field.isRepeater
                    : undefined,
              },
            ])
        : []
    )
  );
}

export async function getSpecialReportDocumentData(
  caseId: string
) {
  const currentUser =
    await requireDashboardUser();

  const entry =
    await prisma.caseEntry.findUnique({
      where: {
        id: caseId,
      },

      include: {
        service: true,
        workflow: true,
        values: {
          include: {
            field: true,
          },
        },
        evidences: true,
        schoolAccount: {
          include: {
            profile: true,
          },
        },
        createdBy: true,
      },
    });

  if (
    !entry ||
    entry.service.slug !==
      SPECIAL_REPORT_SERVICE_SLUG
  ) {
    notFound();
  }

  const isAdmin =
    String(currentUser.user.role) ===
    "ADMIN";

  if (
    !isAdmin &&
    entry.schoolAccountId !==
      currentUser.user.schoolAccountId
  ) {
    notFound();
  }

  const snapshotFieldMeta =
    buildSnapshotFieldMeta(
      entry.workflowSnapshot
    );

  const fields = entry.values
    .map((item) => {
      const meta =
        snapshotFieldMeta.get(
          item.fieldKey
        );
      const items =
        normalizeArrayValue(
          item.jsonValue
        );

      return {
        key: item.fieldKey,
        label:
          meta?.label ||
          item.field?.label ||
          item.fieldKey,
        value: valueToText(
          item.value,
          item.jsonValue
        ),
        items,
        isRepeater:
          Boolean(meta?.isRepeater) ||
          Boolean(item.field?.isRepeater) ||
          isSpecialReportRepeaterFieldKey(
            item.fieldKey
          ),
        order:
          item.field?.order ?? 999,
      };
    })
    .filter(
      (item) =>
        Boolean(item.value) ||
        item.items.length > 0
    )
    .sort(
      (a, b) =>
        a.order - b.order
    );

  const title =
    fields.find(
      (field) =>
        field.key ===
        "special_report_title"
    )?.value ||
    entry.title ||
    "تقرير خاص";

  const performanceElement =
    entry.workflow?.name
      ?.split("|")
      .slice(1)
      .join("|")
      .trim() ||
    "غير محدد";

  return {
    id: entry.id,
    title,
    status: String(entry.status),
    performanceElement,
    createdAt: entry.createdAt,
    submittedAt: entry.submittedAt,
    schoolName:
      entry.schoolAccount.profile
        ?.schoolName ||
      entry.schoolAccount.name ||
      "المدرسة",
    createdByName:
      entry.createdBy?.name || null,
    fields,
    evidences:
      entry.evidences.map(
        (evidence) => ({
          id: evidence.id,
          fileName:
            evidence.fileName ||
            "شاهد",
          fileUrl:
            evidence.fileUrl || "",
          mimeType:
            evidence.mimeType || "",
          note: evidence.note || "",
        })
      ),
  };
}
