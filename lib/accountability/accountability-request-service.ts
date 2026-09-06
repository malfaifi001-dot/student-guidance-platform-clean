import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { getRuntimeWorkflowById } from "@/engine/runtime/runtime-resolver";
import { isConditionalWorkflowFieldVisible } from "@/engine/runtime/workflow-conditional-logic";
import { isAccountabilityTokenExpired, isValidAccountabilityToken } from "@/lib/accountability/accountability-token";
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

async function resolveRespondent(
  context: PrincipalContext,
  respondentUserId: string,
) {
  const respondent = await prisma.user.findFirst({
    where: {
      id: respondentUserId,
      schoolAccountId: context.schoolAccountId,
      isActive: true,
      role: { in: ["TEACHER", "COUNSELOR", "ACTIVITY_LEADER", "STAFF"] },
    },
    select: {
      id: true,
      name: true,
      officialName: true,
      phone: true,
      email: true,
      jobTitle: true,
    },
  });

  if (!respondent) throw new Error("RESPONDENT_NOT_IN_SCHOOL");

  return respondent;
}

export async function createAccountabilityDraft(input: {
  context: PrincipalContext;
  workflowId: string;
  recipient: AccountabilityRequestRecipient;
  categoryKey: string;
  typeKey: string;
  title: string;
  managerValues: AccountabilityValues;
  officialText: string;
  deliveryMethod?: AccountabilityDeliveryMethod;
}) {
  assertPrincipal(input.context);
  const workflow = await getAccountabilityWorkflow(cleanRequired(input.workflowId, "WORKFLOW"));
  const respondentUserId = cleanRequired(input.recipient.respondentUserId, "RESPONDENT");
  const respondent = await resolveRespondent(input.context, respondentUserId);

  return prisma.accountabilityRequest.create({
    data: {
      schoolAccountId: input.context.schoolAccountId,
      createdById: input.context.user.id,
      serviceId: workflow.service.id,
      workflowId: workflow.workflow.id,
      respondentUserId,
      respondentName: respondent.officialName || respondent.name,
      respondentPhone: respondent.phone,
      respondentEmail: respondent.email,
      respondentJobTitle: respondent.jobTitle,
      categoryKey: cleanRequired(input.categoryKey, "CATEGORY"),
      typeKey: cleanRequired(input.typeKey, "TYPE"),
      title: cleanRequired(input.title, "TITLE"),
      managerValues: jsonValue(input.managerValues),
      officialTextSnapshot: cleanRequired(input.officialText, "OFFICIAL_TEXT"),
      deliveryMethod: input.deliveryMethod ?? "SYSTEM",
      token: generateAccountabilityToken(),
      status: "DRAFT",
    },
  });
}

export async function updateAccountabilityDraft(input: {
  context: PrincipalContext;
  requestId: string;
  recipient: AccountabilityRequestRecipient;
  categoryKey: string;
  typeKey: string;
  title: string;
  managerValues: AccountabilityValues;
  officialText: string;
}) {
  const request = await getAccountabilityRequestForPrincipal(
    input.context,
    input.requestId,
  );
  if (!request) throw new Error("ACCOUNTABILITY_REQUEST_NOT_FOUND");
  if (request.status !== "DRAFT") throw new Error("ACCOUNTABILITY_DRAFT_LOCKED");

  const respondentUserId = cleanRequired(input.recipient.respondentUserId, "RESPONDENT");
  const respondent = await resolveRespondent(input.context, respondentUserId);

  return prisma.accountabilityRequest.update({
    where: { id: request.id },
    data: {
      respondentUserId: respondent.id,
      respondentName: respondent.officialName || respondent.name,
      respondentPhone: respondent.phone,
      respondentEmail: respondent.email,
      respondentJobTitle: respondent.jobTitle,
      categoryKey: cleanRequired(input.categoryKey, "CATEGORY"),
      typeKey: cleanRequired(input.typeKey, "TYPE"),
      title: cleanRequired(input.title, "TITLE"),
      managerValues: jsonValue(input.managerValues),
      officialTextSnapshot: cleanRequired(input.officialText, "OFFICIAL_TEXT"),
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
  return prisma.accountabilityRequest.findFirst({ where: principalRequestWhere(context, id), include: { schoolAccount: { include: { profile: true } } } });
}

export async function sendAccountabilityRequest(input: {
  context: PrincipalContext;
  requestId: string;
  deliveryMethod?: AccountabilityDeliveryMethod;
  officialText?: string;
  managerValues?: AccountabilityValues;
  tokenExpiresAt?: Date | null;
}) {
  const request = await getAccountabilityRequestForPrincipal(input.context, input.requestId);
  if (!request) throw new Error("ACCOUNTABILITY_REQUEST_NOT_FOUND");
  if (request.status !== "DRAFT" || !canTransitionAccountabilityRequest(request.status, "SENT")) throw new Error("INVALID_ACCOUNTABILITY_TRANSITION");

  const managerValues = input.managerValues ?? ((request.managerValues || {}) as AccountabilityValues);
  const updated = await prisma.accountabilityRequest.updateMany({
    where: { id: request.id, status: "DRAFT" },
    data: {
      managerValues: jsonValue(managerValues),
      officialTextSnapshot: input.officialText === undefined
        ? request.officialTextSnapshot
        : cleanRequired(input.officialText, "OFFICIAL_TEXT"),
      tokenExpiresAt: input.tokenExpiresAt ?? getAccountabilityTokenExpiry(),
      deliveryMethod: input.deliveryMethod ?? request.deliveryMethod,
      ...statusTimestamp("SENT"),
      status: "SENT",
    },
  });
  if (updated.count !== 1) throw new Error("INVALID_ACCOUNTABILITY_TRANSITION");
  return prisma.accountabilityRequest.findUniqueOrThrow({ where: { id: request.id } });
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

function isEmpty(value: unknown) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function respondentStep(runtime: Awaited<ReturnType<typeof getRuntimeWorkflowById>>) {
  return runtime?.steps.slice().sort((a, b) => a.order - b.order)[1] || null;
}

function reviewStep(runtime: Awaited<ReturnType<typeof getRuntimeWorkflowById>>) {
  return runtime?.steps.slice().sort((a, b) => a.order - b.order)[2] || null;
}

function validateStepValues(step: NonNullable<Awaited<ReturnType<typeof getRuntimeWorkflowById>>>["steps"][number], values: Record<string, unknown>) {
  for (const field of step.fields) {
    if (!isConditionalWorkflowFieldVisible(field, values)) continue;
    const value = values[field.key];
    if (field.isRequired && isEmpty(value)) throw new Error(`REQUIRED_FIELD:${field.key}`);
    if (value === "__OTHER__" && isEmpty(values[`${field.key}__other`])) throw new Error(`REQUIRED_FIELD:${field.key}__other`);
  }
}

export async function getAccountabilityRespondentView(token: string) {
  if (!isValidAccountabilityToken(token)) return null;
  const request = await prisma.accountabilityRequest.findUnique({ where: { token }, include: { schoolAccount: { include: { profile: true } } } });
  if (!request) return null;
  const expired = isAccountabilityTokenExpired(request.tokenExpiresAt);
  if (expired) return { request, workflow: null, respondentStep: null, dependencyValues: {}, expired: true };
  const runtime = await getRuntimeWorkflowById(request.workflowId);
  if (!runtime || runtime.serviceSlug !== ACCOUNTABILITY_SERVICE.slug) return null;
  if (!["SENT", "OPENED", "NEEDS_COMPLETION"].includes(request.status)) {
    const step = respondentStep(runtime);
    return { request, workflow: runtime, respondentStep: step, dependencyValues: {}, expired: false };
  }
  if (request.status === "SENT") {
    await prisma.accountabilityRequest.updateMany({ where: { id: request.id, status: "SENT" }, data: { status: "OPENED", openedAt: new Date() } });
    request.status = "OPENED";
  }
  const step = respondentStep(runtime);
  const managerValues = request.managerValues && typeof request.managerValues === "object" ? request.managerValues as Record<string, unknown> : {};
  const dependencyKeys = new Set(step?.fields.map((field) => field.dependsOnFieldKey).filter((key): key is string => Boolean(key)) || []);
  const dependencyValues = Object.fromEntries([...dependencyKeys].map((key) => [key, managerValues[key]]).filter(([, value]) => !isEmpty(value)));
  return { request, workflow: runtime, respondentStep: step, dependencyValues, expired: false };
}

export function validateAccountabilityRespondentValues(input: {
  workflow: Awaited<ReturnType<typeof getRuntimeWorkflowById>>;
  managerValues: Record<string, unknown>;
  respondentValues: Record<string, unknown>;
}) {
  const step = respondentStep(input.workflow);
  if (!step) throw new Error("ACCOUNTABILITY_RESPONDENT_STEP_MISSING");
  const values = { ...input.managerValues, ...input.respondentValues };
  for (const field of step.fields) {
    if (!isConditionalWorkflowFieldVisible(field, values)) continue;
    const value = input.respondentValues[field.key];
    if (field.isRequired && isEmpty(value)) throw new Error(`REQUIRED_FIELD:${field.key}`);
    if (value === "__OTHER__" && isEmpty(input.respondentValues[`${field.key}__other`])) throw new Error(`REQUIRED_FIELD:${field.key}__other`);
  }
}

export async function submitAccountabilityResponse(input: {
  token: string;
  respondentValues: Record<string, unknown>;
  evidenceItems: unknown[];
}) {
  const view = await getAccountabilityRespondentView(input.token);
  if (!view?.workflow || !["SENT", "OPENED", "NEEDS_COMPLETION"].includes(view.request.status)) throw new Error("ACCOUNTABILITY_REQUEST_NOT_AVAILABLE");
  const managerValues = view.request.managerValues && typeof view.request.managerValues === "object" ? view.request.managerValues as Record<string, unknown> : {};
  validateAccountabilityRespondentValues({ workflow: view.workflow, managerValues, respondentValues: input.respondentValues });
  const evidenceItems = Array.isArray(input.evidenceItems) ? input.evidenceItems.slice(0, 10) : [];
  const updated = await prisma.accountabilityRequest.updateMany({
    where: { id: view.request.id, status: { in: ["SENT", "OPENED", "NEEDS_COMPLETION"] } },
    data: { respondentValues: jsonValue(input.respondentValues), evidenceItems: jsonValue(evidenceItems), respondedAt: new Date(), returnedReason: null, status: "RESPONDED" },
  });
  if (updated.count !== 1) throw new Error("ACCOUNTABILITY_REQUEST_ALREADY_RESPONDED");
  return prisma.accountabilityRequest.findUniqueOrThrow({ where: { id: view.request.id } });
}

export type AccountabilityReviewAction = "RETURN" | "CLOSE" | "REFER";

export async function getAccountabilityReviewView(context: PrincipalContext, requestId: string) {
  const request = await getAccountabilityRequestForPrincipal(context, requestId);
  if (!request) throw new Error("ACCOUNTABILITY_REQUEST_NOT_FOUND");
  const workflow = await getRuntimeWorkflowById(request.workflowId);
  if (!workflow || workflow.serviceSlug !== ACCOUNTABILITY_SERVICE.slug) throw new Error("ACCOUNTABILITY_WORKFLOW_INVALID");
  const steps = workflow.steps.slice().sort((a, b) => a.order - b.order);
  const managerValues = request.managerValues && typeof request.managerValues === "object" ? request.managerValues as Record<string, unknown> : {};
  const respondentValues = request.respondentValues && typeof request.respondentValues === "object" ? request.respondentValues as Record<string, unknown> : {};
  const reviewValues = request.reviewValues && typeof request.reviewValues === "object" ? request.reviewValues as Record<string, unknown> : {};
  return { request, workflow, managerValues, respondentValues, reviewValues, managerStep: steps[0] || null, respondentStep: steps[1] || null, reviewStep: steps[2] || null };
}

export async function reviewAccountabilityRequest(input: {
  context: PrincipalContext;
  requestId: string;
  action: AccountabilityReviewAction;
  reviewValues: AccountabilityValues;
  returnedReason?: string;
}) {
  if (!["RETURN", "CLOSE", "REFER"].includes(input.action)) throw new Error("INVALID_ACCOUNTABILITY_REVIEW_ACTION");
  const view = await getAccountabilityReviewView(input.context, input.requestId);
  if (view.request.status !== "RESPONDED") throw new Error("ACCOUNTABILITY_REVIEW_NOT_AVAILABLE");
  if (!view.reviewStep) throw new Error("ACCOUNTABILITY_REVIEW_STEP_MISSING");
  const combinedValues = { ...view.managerValues, ...view.respondentValues, ...input.reviewValues };
  validateStepValues(view.reviewStep, combinedValues);
  const returnedReason = input.action === "RETURN" ? cleanRequired(input.returnedReason, "RETURNED_REASON") : null;
  const nextStatus = input.action === "RETURN" ? "NEEDS_COMPLETION" : input.action === "CLOSE" ? "CLOSED" : "REFERRED";
  const updated = await prisma.accountabilityRequest.updateMany({
    where: { id: view.request.id, schoolAccountId: input.context.schoolAccountId, createdById: input.context.user.id, status: "RESPONDED" },
    data: {
      status: nextStatus,
      reviewValues: jsonValue(input.reviewValues),
      returnedReason,
      ...statusTimestamp(nextStatus),
    },
  });
  if (updated.count !== 1) throw new Error("INVALID_ACCOUNTABILITY_TRANSITION");
  return prisma.accountabilityRequest.findUniqueOrThrow({ where: { id: view.request.id } });
}
