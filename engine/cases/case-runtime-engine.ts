import { prisma } from "@/lib/prisma";
import { ensureDefaultSchoolAccount } from "@/engine/students/student-import-engine";
import {
  serializeCaseValues,
  type RuntimeCaseValues,
} from "@/lib/cases/case-values";

type SaveRuntimeCaseParams = {
  workflowId?: string | null;
  serviceId: string;
  title?: string | null;
  studentId?: string | null;
  values: RuntimeCaseValues;
  status: "DRAFT" | "SUBMITTED";
};

export async function saveRuntimeCase({
  workflowId,
  serviceId,
  title,
  studentId,
  values,
  status,
}: SaveRuntimeCaseParams) {
  const school = await ensureDefaultSchoolAccount();

  const serializedValues = serializeCaseValues(values);

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
    },
    include: {
      values: true,
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
      student: {
        include: {
          guardian: true,
        },
      },
      workflow: true,
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
          },
        },
      },
      values: true,
    },
  });

  if (!caseEntry) {
    throw new Error("الحالة غير موجودة.");
  }

  return caseEntry;
}