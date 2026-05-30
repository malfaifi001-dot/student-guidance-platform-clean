import { prisma } from "@/lib/prisma";
import { ensureDefaultSchoolAccount } from "@/engine/students/student-import-engine";
import {
  serializeCaseValues,
  type RuntimeCaseValues,
} from "@/lib/cases/case-values";

type EvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
};

type SaveRuntimeCaseParams = {
  workflowId?: string | null;
  serviceId: string;
  title?: string | null;
  studentId?: string | null;
  values: RuntimeCaseValues;
  evidenceItems?: EvidenceItem[];
  status: "DRAFT" | "SUBMITTED";
};

type UpdateRuntimeCaseParams = {
  caseId: string;
  title?: string | null;
  studentId?: string | null;
  values: RuntimeCaseValues;
  evidenceItems?: EvidenceItem[];
  status?: "DRAFT" | "SUBMITTED";
};

function getEvidenceType(mimeType: string) {
  if (mimeType.startsWith("image")) return "IMAGE";
  if (mimeType) return "FILE";
  return "LINK";
}

function normalizeEvidenceItems(items: EvidenceItem[]) {
  return items
    .filter((item) => item.fileUrl && item.fileName)
    .map((item) => ({
      type: getEvidenceType(item.mimeType || ""),
      fileName: item.fileName,
      fileUrl: item.fileUrl,
      mimeType: item.mimeType || "application/octet-stream",
      size: item.size || 0,
    }));
}

export async function saveRuntimeCase({
  workflowId,
  serviceId,
  title,
  studentId,
  values,
  evidenceItems = [],
  status,
}: SaveRuntimeCaseParams) {
  const school = await ensureDefaultSchoolAccount();
  const serializedValues = serializeCaseValues(values);
  const normalizedEvidenceItems = normalizeEvidenceItems(evidenceItems);

  const caseEntry = await prisma.caseEntry.create({
    data: {
      schoolAccountId: school.id,
      serviceId,
      workflowId,
      studentId,
      title: title || "سجل جديد",
      status,
      submittedAt: status === "SUBMITTED" ? new Date() : null,

      values: {
        create: serializedValues,
      },

      evidences: {
        create: normalizedEvidenceItems,
      },
    },
    include: {
      values: true,
      evidences: true,
    },
  });

  return caseEntry;
}

export async function updateRuntimeCase({
  caseId,
  title,
  studentId,
  values,
  evidenceItems = [],
  status,
}: UpdateRuntimeCaseParams) {
  const serializedValues = serializeCaseValues(values);
  const normalizedEvidenceItems = normalizeEvidenceItems(evidenceItems);

  await prisma.caseValue.deleteMany({
    where: {
      caseEntryId: caseId,
    },
  });

  await prisma.evidence.deleteMany({
    where: {
      caseEntryId: caseId,
    },
  });

  const caseEntry = await prisma.caseEntry.update({
    where: {
      id: caseId,
    },
    data: {
      title: title || undefined,
      studentId: studentId || undefined,
      status,
      submittedAt: status === "SUBMITTED" ? new Date() : undefined,

      values: {
        create: serializedValues,
      },

      evidences: {
        create: normalizedEvidenceItems,
      },
    },
    include: {
      values: true,
      evidences: true,
    },
  });

  return caseEntry;
}

export async function restoreCaseDraft(caseId: string) {
  const caseEntry = await prisma.caseEntry.findUnique({
    where: {
      id: caseId,
    },
    include: {
      values: true,
      evidences: true,
      student: {
        include: {
          guardian: true,
        },
      },
      workflow: {
        include: {
          steps: {
            include: {
              fields: {
                include: {
                  options: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      service: true,
    },
  });

  if (!caseEntry) {
    throw new Error("الحالة غير موجودة.");
  }

  const restoredValues = Object.fromEntries(
    caseEntry.values.map((value) => [
      value.fieldKey,
      value.jsonValue ?? value.value,
    ])
  );

  return {
    caseEntry,
    restoredValues,
  };
}

export async function getCaseById(caseId: string) {
  const caseEntry = await prisma.caseEntry.findUnique({
    where: {
      id: caseId,
    },
    include: {
      student: {
        include: {
          guardian: true,
        },
      },
      service: true,
      workflow: {
        include: {
          steps: {
            include: {
              fields: {
                include: {
                  options: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      values: true,
      evidences: true,
    },
  });

  if (!caseEntry) {
    throw new Error("الحالة غير موجودة.");
  }

  return caseEntry;
}