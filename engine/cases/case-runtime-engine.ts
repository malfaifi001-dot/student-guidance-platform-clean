import { prisma } from "@/lib/prisma";
import { CaseStatus, EvidenceType } from "@prisma/client";
import { ensureDefaultSchoolAccount } from "@/engine/students/student-import-engine";
import {
  serializeCaseValues,
  type RuntimeCaseValues,
} from "@/lib/cases/case-values";

type EvidenceItem = {
  id?: string;
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

function toCaseStatus(status?: "DRAFT" | "SUBMITTED") {
  return status === "SUBMITTED" ? CaseStatus.SUBMITTED : CaseStatus.DRAFT;
}

function getEvidenceType(mimeType: string, fileUrl?: string) {
  if (mimeType.startsWith("image/")) {
    return EvidenceType.IMAGE;
  }

  if (fileUrl?.startsWith("http") && !mimeType) {
    return EvidenceType.LINK;
  }

  return EvidenceType.FILE;
}

function normalizeEvidenceItems(items: EvidenceItem[]) {
  return items
    .filter((item) => item.fileUrl && item.fileName)
    .map((item) => {
      const mimeType = item.mimeType || "application/octet-stream";

      return {
        type: getEvidenceType(mimeType, item.fileUrl),
        fileName: item.fileName,
        fileUrl: item.fileUrl,
        mimeType,
        size: item.size || 0,
      };
    });
}

async function assertServiceExists(serviceId: string) {
  const service = await prisma.service.findUnique({
    where: {
      id: serviceId,
    },
    select: {
      id: true,
    },
  });

  if (!service) {
    throw new Error(`serviceId غير موجود في قاعدة البيانات: ${serviceId}`);
  }

  return service;
}

async function findWorkflowOrNull(workflowId?: string | null) {
  if (!workflowId) {
    return null;
  }

  return prisma.workflow.findUnique({
    where: {
      id: workflowId,
    },
    select: {
      id: true,
    },
  });
}

async function findStudentOrNull(studentId?: string | null) {
  if (!studentId) {
    return null;
  }

  return prisma.student.findUnique({
    where: {
      id: studentId,
    },
    select: {
      id: true,
    },
  });
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

  const existingService = await assertServiceExists(serviceId);
  const existingWorkflow = await findWorkflowOrNull(workflowId);
  const existingStudent = await findStudentOrNull(studentId);

  if (workflowId && !existingWorkflow) {
    throw new Error(`workflowId غير موجود في قاعدة البيانات: ${workflowId}`);
  }

  if (studentId && !existingStudent) {
    throw new Error(`studentId غير موجود في قاعدة البيانات: ${studentId}`);
  }

  const serializedValues = serializeCaseValues(values);
  const normalizedEvidenceItems = normalizeEvidenceItems(evidenceItems);

  const caseEntry = await prisma.caseEntry.create({
    data: {
      schoolAccountId: school.id,
      serviceId: existingService.id,
      workflowId: existingWorkflow?.id,
      studentId: existingStudent?.id,
      title: title || undefined,
      status: toCaseStatus(status),
      submittedAt: status === "SUBMITTED" ? new Date() : undefined,

      values: {
        create: serializedValues,
      },

      evidences: {
        create: normalizedEvidenceItems,
      },
    },
    include: {
      service: true,
      workflow: true,
      student: true,
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
  const existingCase = await prisma.caseEntry.findUnique({
    where: {
      id: caseId,
    },
    select: {
      id: true,
    },
  });

  if (!existingCase) {
    throw new Error(`caseId غير موجود في قاعدة البيانات: ${caseId}`);
  }

  const existingStudent = await findStudentOrNull(studentId);

  if (studentId && !existingStudent) {
    throw new Error(`studentId غير موجود في قاعدة البيانات: ${studentId}`);
  }

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
      studentId: studentId ? existingStudent?.id : null,
      status: status ? toCaseStatus(status) : undefined,
      submittedAt: status === "SUBMITTED" ? new Date() : undefined,

      values: {
        create: serializedValues,
      },

      evidences: {
        create: normalizedEvidenceItems,
      },
    },
    include: {
      service: true,
      workflow: true,
      student: true,
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
      schoolAccount: true,

      service: true,

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
                  options: {
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
                orderBy: {
                  order: "asc",
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },

      values: {
        include: {
          field: {
            include: {
              options: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },

      evidences: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!caseEntry) {
    throw new Error("لم يتم العثور على الحالة.");
  }

  return caseEntry;
}