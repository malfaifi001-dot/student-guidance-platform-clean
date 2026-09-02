import { prisma } from "@/lib/prisma";
import { resolveAllowedWorkflowSearchServiceSlugs } from "./workflow-search-access";
import { normalizeWorkflowSearchText, rankWorkflowSearchText, sortWorkflowSearchResults } from "./workflow-search-ranking";
import type { WorkflowSearchResult } from "./workflow-search-types";

function workflowHref(serviceSlug: string) {
  return `/dashboard/teacher/${encodeURIComponent(serviceSlug)}`;
}

export async function searchWorkflows(input: {
  query: string;
  userId: string;
  role: string;
  schoolAccountId: string;
}) {
  const query = input.query.trim();
  if (normalizeWorkflowSearchText(query).length < 2) return [];

  const allowedSlugs = await resolveAllowedWorkflowSearchServiceSlugs({
    role: input.role,
    userId: input.userId,
    schoolAccountId: input.schoolAccountId,
  });
  if (allowedSlugs && allowedSlugs.size === 0) return [];

  const workflows = await prisma.workflow.findMany({
    where: {
      status: "ACTIVE",
      isActive: true,
      service: {
        status: "ACTIVE",
        ...(allowedSlugs ? { slug: { in: [...allowedSlugs] } } : {}),
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      name: true,
      service: { select: { id: true, slug: true, name: true } },
      steps: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          fields: { orderBy: { order: "asc" }, select: { id: true, key: true, label: true } },
        },
      },
    },
  });

  const results: WorkflowSearchResult[] = [];
  const seenServices = new Set<string>();
  for (const workflow of workflows) {
    if (allowedSlugs && !allowedSlugs.has(workflow.service.slug)) continue;
    const href = workflowHref(workflow.service.slug);
    const serviceScore = rankWorkflowSearchText(workflow.service.name, query);
    const workflowScore = rankWorkflowSearchText(workflow.name, query);
    if (serviceScore && !seenServices.has(workflow.service.id)) { seenServices.add(workflow.service.id); results.push({ id: `service:${workflow.service.id}`, type: "SERVICE", title: workflow.service.name, subtitle: "خدمة", serviceId: workflow.service.id, serviceSlug: workflow.service.slug, serviceTitle: workflow.service.name, workflowId: workflow.id, workflowTitle: workflow.name, href, score: serviceScore + 100 }); }
    if (workflowScore) results.push({ id: `workflow:${workflow.id}`, type: "WORKFLOW", title: workflow.name, subtitle: workflow.service.name, serviceId: workflow.service.id, serviceSlug: workflow.service.slug, serviceTitle: workflow.service.name, workflowId: workflow.id, workflowTitle: workflow.name, href, score: workflowScore + 200 });
    for (const step of workflow.steps) {
      const stepScore = rankWorkflowSearchText(step.title, query);
      if (stepScore) results.push({ id: `step:${step.id}`, type: "STEP", title: step.title, subtitle: `${workflow.name} · ${workflow.service.name}`, serviceId: workflow.service.id, serviceSlug: workflow.service.slug, serviceTitle: workflow.service.name, workflowId: workflow.id, workflowTitle: workflow.name, stepId: step.id, stepTitle: step.title, href, score: stepScore + 300 });
      for (const field of step.fields) {
        const fieldScore = rankWorkflowSearchText(field.label, query);
        if (fieldScore) results.push({ id: `field:${field.id}`, type: "FIELD", title: field.label, subtitle: `${step.title} · ${workflow.service.name}`, serviceId: workflow.service.id, serviceSlug: workflow.service.slug, serviceTitle: workflow.service.name, workflowId: workflow.id, workflowTitle: workflow.name, stepId: step.id, stepTitle: step.title, fieldId: field.id, fieldKey: field.key, fieldLabel: field.label, href, score: fieldScore + 400 });
      }
    }
  }

  return sortWorkflowSearchResults(results);
}
