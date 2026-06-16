import { ServiceStatus} from "@prisma/client";

import { workflowUploadServices } from "@/lib/constants/services";
import { prisma } from "@/lib/prisma";

type DashboardWorkflowServiceConfig = {
  slug: string;
  title: string;
  description?: string;
  kind?: string;
};

const EXCLUDED_WORKFLOW_UPLOAD_SLUG_PARTS = [
  "student-record",
  "student-profile",
  "comprehensive-record",
  "comprehensive-reference",
  "reference",
  "reports",
  "report",
  "results-analysis",
  "result-analysis",
  "analysis-results",
  "results",
];

const EXCLUDED_WORKFLOW_UPLOAD_TITLE_PARTS = [
  "المرجع الشامل للموجه الطلابي",
  "المرجع الشامل",
  "التقارير",
  "تحليل النتائج",
];

function normalizeArabicText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDescription(value: unknown) {
  const text = String(value ?? "").trim();

  return text || null;
}

export function isWorkflowUploadEligibleService(
  service: DashboardWorkflowServiceConfig,
) {
  const slug = String(service.slug || "").toLowerCase().trim();
  const title = normalizeArabicText(service.title);

  if (slug === "teacher-report-issuance") {
    return service.kind === "workflow";
  }

  const isExplicitlyExcludedBySlug = EXCLUDED_WORKFLOW_UPLOAD_SLUG_PARTS.some(
    (part) => slug.includes(part),
  );

  const isExplicitlyExcludedByTitle = EXCLUDED_WORKFLOW_UPLOAD_TITLE_PARTS.some(
    (part) => title.includes(normalizeArabicText(part)),
  );

  if (isExplicitlyExcludedBySlug || isExplicitlyExcludedByTitle) {
    return false;
  }

  return service.kind === "workflow";
}

export function getWorkflowUploadServices() {
  return workflowUploadServices.filter(isWorkflowUploadEligibleService);
}

function getServiceConfig(serviceSlug: string): DashboardWorkflowServiceConfig | null {
  const config = workflowUploadServices.find((service) => service.slug === serviceSlug);

  if (!config || !isWorkflowUploadEligibleService(config)) {
    return null;
  }

  return {
    slug: config.slug,
    title: config.title,
    description: config.description,
    kind: config.kind,
  };
}

/**
 * يضمن وجود سجل Service فقط للخدمات التي لها Workflow.
 * لا ينشئ Workflow، ولا ينشر، ولا يغير النسخ القديمة.
 */
export async function ensureDashboardWorkflowService(serviceSlug: string) {
  const serviceConfig = getServiceConfig(serviceSlug);

  if (!serviceConfig) {
    return null;
  }

  return prisma.service.upsert({
    where: {
      slug: serviceConfig.slug,
    },
    update: {
      name: serviceConfig.title,
      description: normalizeDescription(serviceConfig.description),
    },
    create: {
      slug: serviceConfig.slug,
      name: serviceConfig.title,
      description: normalizeDescription(serviceConfig.description),
      status: ServiceStatus.ACTIVE,
    },
  });
}

/**
 * يهيئ خدمات Workflow فقط، ويستبعد:
 * المرجع الشامل للموجه الطلابي، التقارير، تحليل النتائج.
 */
export async function ensureDashboardWorkflowServices() {
  const results = [];

  for (const service of getWorkflowUploadServices()) {
    const ensured = await ensureDashboardWorkflowService(service.slug);

    if (ensured) {
      results.push(ensured);
    }
  }

  return results;
}
