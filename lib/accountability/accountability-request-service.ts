import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import {
  ACCOUNTABILITY_SERVICE,
  canTransitionAccountabilityRequest,
  isAccountabilityRequestStatus,
  type AccountabilityDeliveryMethod,
  type AccountabilityRequestStatus,
  type AccountabilityValues,
  type AccountabilityRequestRecipient,
} from "@/lib/accountability/accountability-types";
import {
  generateAccountabilityToken,
  getAccountabilityTokenExpiry,
} from "@/lib/accountability/accountability-token";
import { buildAccountabilityTextSnapshot } from "@/lib/accountability/accountability-text";

type PrincipalContext = {
  user: { id: string; role: string; schoolAccountId: string | null };
  schoolAccountId: string;
};

function assertPrincipal(context: PrincipalContext) {
  if (context.user.role !== "PRINCIPAL") throw new Error("PRINCIPAL_REQUIRED");
  if (context.user.schoolAccountId !== context.schoolAccountId) throw new Error("SCHOOL_SCOPE_REQUIRED");
}

function cleanRequired(value: unknown, name: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name}_REQUIRED`);
  return text;
}

function cleanOptional(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function principalRequestWhere(context: PrincipalContext, id: string) {
  assertPrincipal(context);
  return {
    id,
    schoolAccountId: context.schoolAccountId,
    createdById: context.user.id,
  };
}

function statusTimestamp(status: AccountabilityRequestStatus) {
  const now = new Date();
  if (status === "SENT") return { sentAt: now };
  if (status === "OPENED") return { openedAt: now };
  if (status === "RESPONDED") return { respondedAt: now };
  if (status === "NEEDS_COMPLETION") return { returnedAt: now };
  if (status === "CLOSED") return { closedAt: now, reviewedAt: now };
  if (status === "REFERRED") return { referredAt: now, reviewedAt: now };
  if (status === "EXPIRED") return { canceledAt: null };
  if (status === "CANCELED") return { canceledAt: now };
  return {};
}

async function getAccountabilityWorkflow(workflowId: string) {
  const runtime = await getRuntimeWorkflowByServiceSlug(ACCOUNTABILITY_SERVICE.slug);
  if (!runtime || runtime.workflow.id !== workflowId) throw new Error("ACCOUNTABILITY_WORKFLOW_INVALID");
  return runtime;
}

export async function createAccountabilityDraft(input: {
  context: PrincipalContext;
  workflowId: string;
  recipient: AccountabilityRequestRecipient;
  categoryKey: string;
  typeKey: string;
  title: string;
  managerValues: AccountabilityValues;
  officialTextTemplate: string;
  deliveryMethod?: AccountabilityDeliveryMethod;
}) {
  assertPrincipal(input.context);
  const workflow = await getAccountabilityWorkflow(cleanRequired(input.workflowId, "WORKFLOW"));
  const respondentUserId = cleanOptional(input.recipient.respondentUserId);

  if (respondentUserId) {
    const respondent = await prisma.user.findFirst({
      where: { id: respondentUserId, schoolAccountId: input.context.schoolAccountId, isActive: true },
      select: { id: true },
    });
    if (!respondent) throw new Error("RESPONDENT_NOT_IN_SCHOOL");
  }

  return prisma.accountabilityRequest.create({
    data: {
      schoolAccountId: input.context.schoolAccountId,
      createdById: input.context.user.id,
      serviceId: workflow.service.id,
      workflowId: workflow.workflow.id,
      respondentUserId,
      respondentName: cleanRequired(input.recipient.respondentName, "RESPONDENT_NAME"),
      respondentPhone: cleanOptional(input.recipient.respondentPhone),
      respondentEmail: cleanOptional(input.recipient.respondentEmail),
      respondentJobTitle: cleanOptional(input.recipient.respondentJobTitle),
      categoryKey: cleanRequired(input.categoryKey, "CATEGORY"),
      typeKey: cleanRequired(input.typeKey, "TYPE"),
      title: cleanRequired(input.title, "TITLE"),
      managerValues: jsonValue(input.managerValues),
      officialTextSnapshot: buildAccountabilityTextSnapshot(input.officialTextTemplate, input.managerValues),
      deliveryMethod: input.deliveryMethod ?? "SYSTEM",
      token: generateAccountabilityToken(),
      status: "DRAFT",
    },
  });
}

export async function listAccountabilityDrafts(context: PrincipalContext) {
  assertPrincipal(context);
  return prisma.accountabilityRequest.findMany({
    where: { schoolAccountId: context.schoolAccountId, createdById: context.user.id },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAccountabilityRequestForPrincipal(context: PrincipalContext, id: string) {
  return prisma.accountabilityRequest.findFirst({ where: principalRequestWhere(context, id) });
}

export async function sendAccountabilityRequest(input: {
  context: PrincipalContext;
  requestId: string;
  officialTextTemplate?: string;
  managerValues?: AccountabilityValues;
  tokenExpiresAt?: Date | null;
}) {
  const request = await getAccountabilityRequestForPrincipal(input.context, input.requestId);
  if (!request) throw new Error("ACCOUNTABILITY_REQUEST_NOT_FOUND");
  if (request.status !== "DRAFT" || !canTransitionAccountabilityRequest(request.status, "SENT")) throw new Error("INVALID_ACCOUNTABILITY_TRANSITION");

  const managerValues = input.managerValues ?? ((request.managerValues || {}) as AccountabilityValues);
  return prisma.accountabilityRequest.update({
    where: { id: request.id },
    data: {
      managerValues: jsonValue(managerValues),
      officialTextSnapshot: input.officialTextTemplate === undefined
        ? request.officialTextSnapshot
        : buildAccountabilityTextSnapshot(input.officialTextTemplate, managerValues),
      tokenExpiresAt: input.tokenExpiresAt ?? getAccountabilityTokenExpiry(),
      ...statusTimestamp("SENT"),
      status: "SENT",
    },
  });
}

export async function transitionAccountabilityRequest(input: {
  context: PrincipalContext;
  requestId: string;
  to: AccountabilityRequestStatus;
  respondentValues?: AccountabilityValues;
  reviewValues?: AccountabilityValues;
  returnedReason?: string | null;
}) {
  if (!isAccountabilityRequestStatus(input.to)) throw new Error("INVALID_ACCOUNTABILITY_STATUS");
  const request = await getAccountabilityRequestForPrincipal(input.context, input.requestId);
  if (!request || !isAccountabilityRequestStatus(request.status)) throw new Error("ACCOUNTABILITY_REQUEST_NOT_FOUND");
  if (!canTransitionAccountabilityRequest(request.status, input.to)) throw new Error("INVALID_ACCOUNTABILITY_TRANSITION");

  return prisma.accountabilityRequest.update({
    where: { id: request.id },
    data: {
      status: input.to,
      ...statusTimestamp(input.to),
      ...(input.respondentValues === undefined ? {} : { respondentValues: jsonValue(input.respondentValues) }),
      ...(input.reviewValues === undefined ? {} : { reviewValues: jsonValue(input.reviewValues) }),
      ...(input.returnedReason === undefined ? {} : { returnedReason: cleanOptional(input.returnedReason) }),
    },
  });
}
