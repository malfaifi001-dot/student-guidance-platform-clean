import { prisma } from "@/lib/prisma";
import { guardianSummonsTemplatePreset } from "@/components/report-engine/guardian-summons-letter-preview";

const DESIGN_PRESET = "guardian-summons-letter-v1";
const PRESET_ID = "tpl-guardian-summons-letter";

type DbReportTemplateLike = {
  id?: string;
  name?: string | null;
  description?: string | null;
  serviceSlug?: string | null;
  isActive?: boolean | null;
  templateJson?: unknown;
  content?: unknown;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

export async function resolveGuardianSummonsTemplate() {
  const savedTemplate = await findSavedGuardianSummonsTemplate();

  if (savedTemplate) {
    return savedTemplate;
  }

  return guardianSummonsTemplatePreset;
}

async function findSavedGuardianSummonsTemplate() {
  try {
    const prismaAny = prisma as unknown as {
      reportTemplate?: {
        findMany: (args: unknown) => Promise<DbReportTemplateLike[]>;
      };
    };

    if (!prismaAny.reportTemplate?.findMany) {
      return null;
    }

    const rows = await prismaAny.reportTemplate.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
    });

    const normalized = rows
      .map(normalizeSavedTemplate)
      .filter(Boolean) as Array<typeof guardianSummonsTemplatePreset>;

    const published = normalized.find(
      (template: any) =>
        template.designPreset === DESIGN_PRESET &&
        template.status === "PUBLISHED"
    );

    if (published) return published;

    const latest = normalized.find(
      (template: any) => template.designPreset === DESIGN_PRESET
    );

    return latest || null;
  } catch (error) {
    console.error("resolveGuardianSummonsTemplate failed:", error);
    return null;
  }
}

function normalizeSavedTemplate(row: DbReportTemplateLike) {
  const raw = row.templateJson ?? row.content;

  let parsed = raw;

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const template = parsed as Record<string, unknown>;

  const designPreset = String(template.designPreset || "");

  if (designPreset !== DESIGN_PRESET && row.id !== PRESET_ID) {
    return null;
  }

  return {
    ...guardianSummonsTemplatePreset,
    ...template,
    id: String(template.id || row.id || PRESET_ID),
    name: String(template.name || row.name || guardianSummonsTemplatePreset.name),
    description: String(
      template.description ||
        row.description ||
        guardianSummonsTemplatePreset.description
    ),
    serviceSlug:
      typeof template.serviceSlug === "string"
        ? template.serviceSlug
        : row.serviceSlug || undefined,
    designPreset: DESIGN_PRESET,
    updatedAt: String(
      template.updatedAt ||
        row.updatedAt ||
        row.createdAt ||
        guardianSummonsTemplatePreset.updatedAt
    ),
    pages:
      Array.isArray(template.pages) && template.pages.length
        ? template.pages
        : guardianSummonsTemplatePreset.pages,
  } as any;
}
