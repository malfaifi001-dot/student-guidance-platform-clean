import { prisma } from "@/lib/prisma";
import { CaseStatus, EvidenceType } from "@prisma/client";
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

type CaseAccessScope = {
  schoolAccountId?: string | null;
  isAdmin?: boolean;
};

type SaveRuntimeCaseParams = {
  schoolAccountId: string;
  createdById?: string | null;
  workflowId?: string | null;
  serviceId: string;
  title?: string | null;
  studentId?: string | null;
  values: RuntimeCaseValues;
  evidenceItems?: EvidenceItem[];
  status: "DRAFT" | "SUBMITTED";
};

type UpdateRuntimeCaseParams = CaseAccessScope & {
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

function assertSchoolScope(scope: CaseAccessScope) {
  if (scope.isAdmin) {
    return;
  }

  if (!scope.schoolAccountId) {
    throw new Error("لا يمكن تنفيذ العملية بدون ربط المستخدم بمدرسة.");
  }
}

function buildCaseWhere(caseId: string, scope: CaseAccessScope) {
  if (scope.isAdmin) {
    return {
      id: caseId,
    };
  }

  const schoolAccountId = scope.schoolAccountId;

  if (!schoolAccountId) {
    throw new Error("لا يمكن تنفيذ العملية بدون ربط المستخدم بمدرسة.");
  }

  return {
    id: caseId,
    schoolAccountId,
  };
}

async function assertServiceExists(serviceId: string) {
  const service = await prisma.service.findUnique({
    where: {
      id: serviceId,
    },
    select: {
      id: true,
      slug: true,
      status: true,
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
      serviceId: true,
      status: true,
      isActive: true,
    },
  });
}

async function buildWorkflowSnapshotForCase(workflowId?: string | null) {
  if (!workflowId) {
    return null;
  }

  const workflow = await prisma.workflow.findUnique({
    where: {
      id: workflowId,
    },
    include: {
      service: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
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
  });

  if (!workflow) {
    return null;
  }

  return {
    capturedAt: new Date().toISOString(),
    id: workflow.id,
    name: workflow.name,
    version: workflow.version,
    status: workflow.status,
    isActive: workflow.isActive,
    workflowType: workflow.workflowType,
    service: workflow.service,
    steps: workflow.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      order: step.order,
      fields: step.fields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        helpText: field.helpText,
        isRequired: field.isRequired,
        order: field.order,
        dependsOnFieldKey: field.dependsOnFieldKey,
        linkedToValue: field.linkedToValue,
        allowOther: field.allowOther,
        options: field.options.map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          order: option.order,
          linkedToValue: option.linkedToValue,
        })),
      })),
    })),
  };
}


type RuntimeStudentSnapshotSource = {
  id: string;
  schoolAccountId: string;
  fullName: string;
  nationalId: string | null;
  gender: string | null;
  stage: string | null;
  grade: string | null;
  classroom: string | null;
  isActive: boolean;
  guardian: {
    id: string;
    name: string;
    phone: string | null;
    relation: string | null;
  } | null;
};

function buildStudentSnapshots(student: RuntimeStudentSnapshotSource) {
  const studentSnapshot = {
    id: student.id,
    fullName: student.fullName,
    nationalId: student.nationalId,
    gender: student.gender,
    stage: student.stage,
    grade: student.grade,
    classroom: student.classroom,
    isActive: student.isActive,
    capturedAt: new Date().toISOString(),
  };

  const guardianSnapshot = student.guardian
    ? {
        id: student.guardian.id,
        name: student.guardian.name,
        phone: student.guardian.phone,
        relation: student.guardian.relation,
        capturedAt: new Date().toISOString(),
      }
    : null;

  return {
    studentSnapshot,
    guardianSnapshot,
    selectedStudent: {
      ...studentSnapshot,
      guardian: guardianSnapshot,
      guardianName: guardianSnapshot?.name ?? null,
      guardianPhone: guardianSnapshot?.phone ?? null,
    },
  };
}

function mergeStudentSnapshotsIntoValues(
  values: RuntimeCaseValues,
  student: RuntimeStudentSnapshotSource | null
): RuntimeCaseValues {
  const nextValues = { ...(values || {}) } as Record<string, unknown>;

  if (!student) {
    delete nextValues.selectedStudent;
    delete nextValues.studentSnapshot;
    delete nextValues.guardianSnapshot;

    return nextValues as unknown as RuntimeCaseValues;
  }

  const snapshots = buildStudentSnapshots(student);

  nextValues.selectedStudent = snapshots.selectedStudent;
  nextValues.studentSnapshot = snapshots.studentSnapshot;
  nextValues.guardianSnapshot = snapshots.guardianSnapshot;

  return nextValues as unknown as RuntimeCaseValues;
}

// SMART_STUDENT_SERVER_SNAPSHOT_MARKER

async function findStudentOrNull(
  studentId: string | null | undefined,
  scope: CaseAccessScope
) {
  if (!studentId) {
    return null;
  }

  assertSchoolScope(scope);

  const schoolAccountId = scope.schoolAccountId;

  return prisma.student.findFirst({
    where: {
      id: studentId,
      ...(scope.isAdmin ? {} : { schoolAccountId: schoolAccountId as string }),
    },
    select: {
      id: true,
      schoolAccountId: true,
      fullName: true,
      nationalId: true,
      gender: true,
      stage: true,
      grade: true,
      classroom: true,
      isActive: true,
      guardian: {
        select: {
          id: true,
          name: true,
          phone: true,
          relation: true,
        },
      },
    },
  });
}

export async function saveRuntimeCase({
  schoolAccountId,
  createdById,
  workflowId,
  serviceId,
  title,
  studentId,
  values,
  evidenceItems = [],
  status,
}: SaveRuntimeCaseParams) {
  const scope = {
    schoolAccountId,
    isAdmin: false,
  };

  const existingService = await assertServiceExists(serviceId);
  const existingWorkflow = await findWorkflowOrNull(workflowId);
  const existingStudent = await findStudentOrNull(studentId, scope);

  if (workflowId && !existingWorkflow) {
    throw new Error(`workflowId غير موجود في قاعدة البيانات: ${workflowId}`);
  }

  if (existingWorkflow && existingWorkflow.serviceId !== existingService.id) {
    throw new Error("الـ workflow لا يتبع الخدمة المحددة.");
  }

  if (studentId && !existingStudent) {
    throw new Error("الطالب غير موجود أو لا يتبع مدرستك.");
  }

  const valuesWithStudentSnapshot = mergeStudentSnapshotsIntoValues(
    values,
    existingStudent
  );
  const serializedValues = serializeCaseValues(valuesWithStudentSnapshot);
  const normalizedEvidenceItems = normalizeEvidenceItems(evidenceItems);
  const workflowSnapshot = await buildWorkflowSnapshotForCase(existingWorkflow?.id);

  const caseEntry = await prisma.caseEntry.create({
    data: {
      schoolAccountId,
      serviceId: existingService.id,
      workflowId: existingWorkflow?.id,
      workflowSnapshot: workflowSnapshot || undefined,
      studentId: existingStudent?.id,
      createdById: createdById || null,
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
  schoolAccountId,
  isAdmin = false,
  title,
  studentId,
  values,
  evidenceItems = [],
  status,
}: UpdateRuntimeCaseParams) {
  const scope = {
    schoolAccountId,
    isAdmin,
  };

  const existingCase = await prisma.caseEntry.findFirst({
    where: buildCaseWhere(caseId, scope),
    select: {
      id: true,
      schoolAccountId: true,
    },
  });

  if (!existingCase) {
    throw new Error("الحالة غير موجودة أو لا تملك صلاحية الوصول إليها.");
  }

  const existingStudent = await findStudentOrNull(studentId, {
    schoolAccountId: existingCase.schoolAccountId,
    isAdmin,
  });

  if (studentId && !existingStudent) {
    throw new Error("الطالب غير موجود أو لا يتبع نفس مدرسة الحالة.");
  }

  const valuesWithStudentSnapshot = mergeStudentSnapshotsIntoValues(
    values,
    existingStudent
  );
  const serializedValues = serializeCaseValues(valuesWithStudentSnapshot);
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

export async function restoreCaseDraft(
  caseId: string,
  scope: CaseAccessScope
) {
  const caseEntry = await prisma.caseEntry.findFirst({
    where: buildCaseWhere(caseId, scope),
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
    throw new Error("الحالة غير موجودة أو لا تملك صلاحية الوصول إليها.");
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

export async function getCaseById(
  caseId: string,
  scope: CaseAccessScope
) {
  const caseEntry = await prisma.caseEntry.findFirst({
    where: buildCaseWhere(caseId, scope),
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

      guidanceReports: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          status: true,
          templateId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!caseEntry) {
    throw new Error("لم يتم العثور على الحالة أو لا تملك صلاحية الوصول إليها.");
  }

  return caseEntry;
}

