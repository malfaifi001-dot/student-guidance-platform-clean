import { prisma } from "@/lib/prisma";
import { CaseStatus, EvidenceType} from "@prisma/client";
import { buildCaseEntryWhereForUser } from "@/lib/cases/case-access-scope";
import {
  serializeCaseValues,
  type RuntimeCaseValues,
} from "@/lib/cases/case-values";
import { isAllowedSystemCaseValueKey } from "@/lib/cases/system-case-value-keys";

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
  userId?: string | null;
  userRole?: string | null;
  userEmail?: string | null;
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
    ...buildCaseEntryWhereForUser({
      id: scope.userId || "__NO_USER__",
      role: scope.userRole || "COUNSELOR",
      schoolAccountId,
      email: scope.userEmail,
    }),
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
    studentPickerMode: workflow.studentPickerMode,
    evidenceMode: workflow.evidenceMode,
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
        behaviorConfig: field.behaviorConfig,
        allowOther: field.allowOther,
        isRepeater: field.isRepeater,
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

type RuntimeValidationField = {
  key: string;
  type: string;
  allowOther: boolean;
  options: Array<{ value: string }>;
};

const CHOICE_FIELD_TYPES = new Set([
  "SELECT",
  "MULTI_SELECT",
  "RADIO",
  "CHECKBOX",
]);

function getSnapshotWorkflowRecord(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return null;

  const record = snapshot as Record<string, unknown>;
  if (Array.isArray(record.steps)) return record;

  for (const key of ["workflow", "runtimeWorkflow"]) {
    const nested = record[key];
    if (
      nested &&
      typeof nested === "object" &&
      Array.isArray((nested as Record<string, unknown>).steps)
    ) {
      return nested as Record<string, unknown>;
    }
  }

  return null;
}

function fieldsFromWorkflowSnapshot(snapshot: unknown): RuntimeValidationField[] {
  const workflow = getSnapshotWorkflowRecord(snapshot);
  if (!workflow || !Array.isArray(workflow.steps)) return [];

  return workflow.steps.flatMap((step) => {
    if (!step || typeof step !== "object") return [];
    const fields = (step as Record<string, unknown>).fields;
    if (!Array.isArray(fields)) return [];

    return fields.flatMap((field) => {
      if (!field || typeof field !== "object") return [];
      const record = field as Record<string, unknown>;
      const key = String(record.key || "").trim();
      if (!key) return [];

      const options = Array.isArray(record.options)
        ? record.options
            .map((option) =>
              option && typeof option === "object"
                ? String((option as Record<string, unknown>).value || "").trim()
                : "",
            )
            .filter(Boolean)
            .map((value) => ({ value }))
        : [];

      return [{
        key,
        type: String(record.type || "TEXT").toUpperCase(),
        allowOther: Boolean(record.allowOther),
        options,
      }];
    });
  });
}

async function getRuntimeValidationFields(existingCase: {
  workflowId: string | null;
  workflowSnapshot: unknown;
}) {
  const snapshotFields = fieldsFromWorkflowSnapshot(existingCase.workflowSnapshot);
  if (snapshotFields.length || !existingCase.workflowId) return snapshotFields;

  const workflow = await prisma.workflow.findUnique({
    where: { id: existingCase.workflowId },
    select: {
      steps: {
        select: {
          fields: {
            select: {
              key: true,
              type: true,
              allowOther: true,
              options: { select: { value: true } },
            },
          },
        },
      },
    },
  });

  return (
    workflow?.steps.flatMap((step) =>
      step.fields.map((field) => ({
        key: field.key,
        type: String(field.type),
        allowOther: field.allowOther,
        options: field.options,
      })),
    ) || []
  );
}

async function validateRuntimeCaseValues(
  existingCase: {
    workflowId: string | null;
    workflowSnapshot: unknown;
    service: { slug: string };
  },
  values: RuntimeCaseValues,
) {
  const fields = await getRuntimeValidationFields(existingCase);
  const fieldMap = new Map(fields.map((field) => [field.key, field]));

  for (const [key, value] of Object.entries(values || {})) {
    if (isAllowedSystemCaseValueKey(existingCase.service.slug, key)) {
      continue;
    }

    if (key.endsWith("__other")) {
      const parent = fieldMap.get(key.slice(0, -7));
      if (parent?.allowOther) continue;
    }

    const field = fieldMap.get(key);
    if (!field) {
      throw new Error(`الحقل غير تابع لـ Workflow الحالة: ${key}`);
    }

    if (!CHOICE_FIELD_TYPES.has(field.type) || value == null || value === "") {
      continue;
    }

    const allowedValues = new Set(field.options.map((option) => option.value));
    if (field.allowOther) allowedValues.add("__OTHER__");
    const selectedValues = Array.isArray(value) ? value : [value];

    for (const selectedValue of selectedValues) {
      if (
        (typeof selectedValue !== "string" &&
          typeof selectedValue !== "number" &&
          typeof selectedValue !== "boolean") ||
        !allowedValues.has(String(selectedValue))
      ) {
        throw new Error(`الخيار المحدد لا يتبع الحقل: ${field.key}`);
      }
    }
  }
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
  const studentSchoolScope = schoolAccountId ? { schoolAccountId } : {};

  return prisma.student.findFirst({
    where: {
      id: studentId,
      ...studentSchoolScope,
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

  const normalizedStudentId = String(studentId ?? "").trim() || null;
  const existingService = await assertServiceExists(serviceId);
  const existingWorkflow = await findWorkflowOrNull(workflowId);
  const existingStudent = await findStudentOrNull(normalizedStudentId, scope);

  if (workflowId && !existingWorkflow) {
    throw new Error(`workflowId غير موجود في قاعدة البيانات: ${workflowId}`);
  }

  if (existingWorkflow && existingWorkflow.serviceId !== existingService.id) {
    throw new Error("الـ workflow لا يتبع الخدمة المحددة.");
  }

  if (normalizedStudentId && !existingStudent) {
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
      studentId: existingStudent?.id ?? null,
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
      workflowId: true,
      workflowSnapshot: true,
      service: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!existingCase) {
    throw new Error("الحالة غير موجودة أو لا تملك صلاحية الوصول إليها.");
  }

  const normalizedStudentId = String(studentId ?? "").trim() || null;
  const existingStudent = await findStudentOrNull(normalizedStudentId, {
    schoolAccountId: existingCase.schoolAccountId,
    isAdmin,
  });

  if (normalizedStudentId && !existingStudent) {
    throw new Error("الطالب غير موجود أو لا يتبع نفس مدرسة الحالة.");
  }

  const valuesWithStudentSnapshot = mergeStudentSnapshotsIntoValues(
    values,
    existingStudent
  );
  await validateRuntimeCaseValues(existingCase, valuesWithStudentSnapshot);
  const serializedValues = serializeCaseValues(valuesWithStudentSnapshot);
  const normalizedEvidenceItems = normalizeEvidenceItems(evidenceItems);
  const caseEntry = await prisma.$transaction(async (tx) => {
    await tx.caseValue.deleteMany({ where: { caseEntryId: caseId } });
    await tx.evidence.deleteMany({ where: { caseEntryId: caseId } });

    return tx.caseEntry.update({
      where: { id: caseId },
      data: {
        title: title || undefined,
        studentId: existingStudent?.id ?? null,
        status: status ? toCaseStatus(status) : undefined,
        submittedAt: status === "SUBMITTED" ? new Date() : undefined,
        values: { create: serializedValues },
        evidences: { create: normalizedEvidenceItems },
      },
      include: {
        service: true,
        workflow: true,
        student: true,
        values: true,
        evidences: true,
      },
    });
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

