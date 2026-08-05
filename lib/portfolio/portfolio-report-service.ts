import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireOwnedPortfolio, PortfolioServiceError, type PortfolioActor } from "@/lib/portfolio/portfolio-authorization";
import { TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS, TEACHER_PORTFOLIO_SERVICE_SLUGS } from "@/lib/portfolio/portfolio-performance-elements";
import { normalizePortfolioReportPayload, type PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";
import type { PortfolioCustomEvidence, PortfolioEvidencePreference, PortfolioManagedEvidence, PortfolioManagedReport, PortfolioReportSourceType } from "@/lib/portfolio/portfolio-types";

type JsonMap = Record<string, unknown>;
type EligibleReport = Omit<PortfolioManagedReport, "itemId" | "isVisible" | "sortOrder" | "isPersisted" | "isAvailable" | "evidence"> & { content: PortfolioReportContent };

function object(value: unknown): JsonMap {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonMap : {};
}
function json(value: JsonMap): Prisma.InputJsonValue { return value as Prisma.InputJsonValue; }

export function portfolioReportItemId(portfolioId: string, sourceType: PortfolioReportSourceType, sourceId: string) {
  return `pri_${createHash("sha256").update(`${portfolioId}:${sourceType}:${sourceId}`).digest("hex").slice(0, 36)}`;
}

function emptyContent(input: { title: string; serviceName: string; issuedAt: string | null; evidence: Array<{ id: string; title: string; url: string | null; type: string }> }): PortfolioReportContent {
  return {
    reportType: "PORTFOLIO_REPORT",
    title: input.title,
    subtitle: input.serviceName,
    schoolName: "",
    logoUrl: null,
    issuedAt: input.issuedAt,
    issuedBy: null,
    serviceName: input.serviceName,
    primaryFields: [], detailFields: [], normalizedFields: [], narrative: null,
    evidenceSettings: { layout: "TWO_PER_PAGE", fit: "contain", aspectRatio: "LANDSCAPE_4_3", showCaptions: true },
    evidenceItems: input.evidence,
  };
}

function withEvidence(content: PortfolioReportContent | null, fallback: Parameters<typeof emptyContent>[0]) {
  return { ...(content || emptyContent(fallback)), evidenceItems: fallback.evidence };
}

export async function discoverEligiblePortfolioReports(user: PortfolioActor, portfolioId: string): Promise<EligibleReport[]> {
  await requireOwnedPortfolio(user, portfolioId);
  const cases = await prisma.caseEntry.findMany({
    where: { schoolAccountId: user.schoolAccountId!, createdById: user.id, service: { slug: { in: TEACHER_PORTFOLIO_SERVICE_SLUGS } } },
    select: { id: true },
  });
  const caseIds = cases.map((item) => item.id);
  const sections = await prisma.achievementPortfolioSection.findMany({ where: { portfolioId, kind: "PERFORMANCE_ELEMENT" } });
  const sectionBySlug = new Map<string, { id: string; key: string }>();
  for (const section of sections) {
    const definition = TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS.find((item) => item.key === section.sectionKey);
    if (definition) sectionBySlug.set(definition.serviceSlug, { id: section.id, key: section.sectionKey });
  }
  const [guidance, active, snapshots] = await Promise.all([
    prisma.guidanceReport.findMany({
      where: { serviceSlug: { in: TEACHER_PORTFOLIO_SERVICE_SLUGS }, caseEntry: { schoolAccountId: user.schoolAccountId!, createdById: user.id } },
      include: { caseEntry: { include: { service: true } }, evidenceItems: { where: { visible: true }, orderBy: { sortOrder: "asc" } } },
      orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }], take: 200,
    }),
    prisma.reportTwoActive.findMany({
      where: { caseEntryId: { in: caseIds }, schoolAccountId: user.schoolAccountId!, serviceSlug: { in: TEACHER_PORTFOLIO_SERVICE_SLUGS }, status: "APPROVED" },
      orderBy: { updatedAt: "desc" }, take: 200,
    }),
    prisma.reportSnapshot.findMany({
      where: { caseEntryId: { in: caseIds }, schoolAccountId: user.schoolAccountId!, serviceSlug: { in: TEACHER_PORTFOLIO_SERVICE_SLUGS } },
      orderBy: { approvedAt: "desc" }, take: 200,
    }),
  ]);
  const results: EligibleReport[] = [];
  for (const report of guidance) {
    const section = sectionBySlug.get(report.serviceSlug); if (!section) continue;
    const evidence = report.evidenceItems.map((item) => ({ id: item.id, title: item.caption || item.fileName, url: item.fileUrl || null, type: item.mimeType?.startsWith("image/") ? "IMAGE" : item.mimeType || "FILE" }));
    const serviceName = report.caseEntry.service.name || report.serviceSlug;
    const base = normalizePortfolioReportPayload(report.reportDataSnapshot);
    results.push({ sourceId: report.id, sourceType: "GUIDANCE_REPORT", sectionId: section.id, sectionKey: section.key, title: report.title, serviceName, caseTitle: report.caseEntry.title, status: report.status, generatedAt: report.generatedAt?.toISOString() || null, createdAt: report.createdAt.toISOString(), previewUrl: `/dashboard/report/${report.id}/preview`, content: withEvidence(base, { title: report.title, serviceName, issuedAt: report.generatedAt?.toISOString() || null, evidence }) });
  }
  for (const report of active) {
    const section = report.serviceSlug ? sectionBySlug.get(report.serviceSlug) : null; if (!section) continue;
    const content = normalizePortfolioReportPayload(report.sourcePayload) || emptyContent({ title: report.reportTitle, serviceName: report.serviceName || report.serviceSlug || "تقرير", issuedAt: report.approvedAt?.toISOString() || null, evidence: [] });
    results.push({ sourceId: report.id, sourceType: "REPORT_SNAPSHOT", sectionId: section.id, sectionKey: section.key, title: content.title || report.reportTitle, serviceName: content.serviceName || report.serviceName || "تقرير", caseTitle: null, status: report.status, generatedAt: (report.approvedAt || report.savedAt).toISOString(), createdAt: report.createdAt.toISOString(), previewUrl: `/dashboard/report-2/snapshots/${report.id}/preview`, content });
  }
  const activeIds = new Set(active.map((item) => item.id));
  for (const report of snapshots) {
    if (activeIds.has(report.id)) continue;
    const section = report.serviceSlug ? sectionBySlug.get(report.serviceSlug) : null; if (!section) continue;
    const content = normalizePortfolioReportPayload(report.snapshotPayload) || emptyContent({ title: report.reportTitle, serviceName: report.serviceName || report.serviceSlug || "تقرير", issuedAt: report.approvedAt.toISOString(), evidence: [] });
    results.push({ sourceId: report.id, sourceType: "REPORT_SNAPSHOT", sectionId: section.id, sectionKey: section.key, title: content.title || report.reportTitle, serviceName: content.serviceName || report.serviceName || "تقرير", caseTitle: null, status: "APPROVED", generatedAt: report.approvedAt.toISOString(), createdAt: report.createdAt.toISOString(), previewUrl: `/dashboard/report-2/snapshots/${report.id}/preview`, content });
  }
  return results;
}

function evidencePreferences(metadata: unknown) {
  return object(object(metadata).evidencePreferences);
}

export function manageEvidence(content: PortfolioReportContent, metadata: unknown): PortfolioManagedEvidence[] {
  const preferences = evidencePreferences(metadata);
  return content.evidenceItems.map((item, index) => {
    const pref = object(preferences[item.id]);
    return { id: item.id, originalTitle: item.title, title: typeof pref.customTitle === "string" && pref.customTitle ? pref.customTitle : item.title, description: typeof pref.customDescription === "string" ? pref.customDescription : "", url: item.url, type: item.type, isVisible: pref.isVisible !== false, sortOrder: typeof pref.sortOrder === "number" ? pref.sortOrder : (index + 1) * 10 };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function applyEvidencePreferences(content: PortfolioReportContent, metadata: unknown): PortfolioReportContent {
  return { ...content, evidenceItems: manageEvidence(content, metadata).filter((item) => item.isVisible && item.url).map((item) => ({ id: item.id, title: item.title, description: item.description, url: item.url, type: item.type })) };
}

export async function loadManagedPortfolioReports(user: PortfolioActor, portfolioId: string) {
  const discovered = await discoverEligiblePortfolioReports(user, portfolioId);
  const stored = await prisma.achievementPortfolioItem.findMany({ where: { portfolioId, sourceType: { in: ["GUIDANCE_REPORT", "REPORT_SNAPSHOT"] } } });
  const storedByKey = new Map(stored.filter((item) => item.sourceId).map((item) => [`${item.sourceType}:${item.sourceId}`, item]));
  const currentKeys = new Set(discovered.map((item) => `${item.sourceType}:${item.sourceId}`));
  const reports: Array<PortfolioManagedReport & { content: PortfolioReportContent }> = discovered.map((report, index) => {
    const item = storedByKey.get(`${report.sourceType}:${report.sourceId}`);
    const managedEvidence = manageEvidence(report.content, item?.metadataJson);
    return { ...report, itemId: item?.id || portfolioReportItemId(portfolioId, report.sourceType, report.sourceId), isVisible: item?.isVisible ?? true, sortOrder: item?.sortOrder ?? (index + 1) * 10, isPersisted: Boolean(item), isAvailable: true, evidence: managedEvidence, content: applyEvidencePreferences(report.content, item?.metadataJson) };
  });
  for (const item of stored) {
    const key = `${item.sourceType}:${item.sourceId}`;
    if (!item.sourceId || currentKeys.has(key)) continue;
    const meta = object(item.metadataJson);
    reports.push({ itemId: item.id, sourceId: item.sourceId, sourceType: item.sourceType as PortfolioReportSourceType, sectionId: item.sectionId || "", sectionKey: typeof meta.sectionKey === "string" ? meta.sectionKey : "", title: item.title, serviceName: typeof meta.serviceName === "string" ? meta.serviceName : "", caseTitle: null, status: "UNAVAILABLE", generatedAt: null, createdAt: item.createdAt.toISOString(), previewUrl: "", isVisible: item.isVisible, sortOrder: item.sortOrder, isPersisted: true, isAvailable: false, evidence: [], content: emptyContent({ title: item.title, serviceName: "", issuedAt: null, evidence: [] }) });
  }
  reports.sort((a, b) => a.sortOrder - b.sortOrder);
  return reports;
}

async function ensureManagedReportItem(user: PortfolioActor, portfolioId: string, itemId: string) {
  await requireOwnedPortfolio(user, portfolioId);
  const existing = await prisma.achievementPortfolioItem.findFirst({ where: { id: itemId, portfolioId, sourceType: { in: ["GUIDANCE_REPORT", "REPORT_SNAPSHOT"] } } });
  if (existing) {
    const eligible = await discoverEligiblePortfolioReports(user, portfolioId);
    if (!eligible.some((report) => report.sourceId === existing.sourceId && report.sourceType === existing.sourceType)) throw new PortfolioServiceError(409, "مصدر التقرير لم يعد متاحًا.");
    return existing;
  }
  const eligible = await discoverEligiblePortfolioReports(user, portfolioId);
  const report = eligible.find((entry) => portfolioReportItemId(portfolioId, entry.sourceType, entry.sourceId) === itemId);
  if (!report) throw new PortfolioServiceError(404, "التقرير غير موجود أو لا تملك صلاحية الوصول إليه.");
  const last = await prisma.achievementPortfolioItem.findFirst({ where: { portfolioId, sectionId: report.sectionId, sourceType: { in: ["GUIDANCE_REPORT", "REPORT_SNAPSHOT"] } }, orderBy: { sortOrder: "desc" } });
  return prisma.achievementPortfolioItem.create({ data: { id: itemId, portfolioId, sectionId: report.sectionId, sourceType: report.sourceType, sourceId: report.sourceId, title: report.title, isVisible: true, sortOrder: (last?.sortOrder || 0) + 10, metadataJson: json({ sectionKey: report.sectionKey, serviceName: report.serviceName, evidencePreferences: {}, unavailable: false }) } });
}

export async function syncPortfolioReports(user: PortfolioActor, portfolioId: string) {
  await requireOwnedPortfolio(user, portfolioId);
  const discovered = await discoverEligiblePortfolioReports(user, portfolioId);
  const existing = await prisma.achievementPortfolioItem.findMany({ where: { portfolioId, sourceType: { in: ["GUIDANCE_REPORT", "REPORT_SNAPSHOT"] } } });
  const keys = new Set(existing.filter((item) => item.sourceId).map((item) => `${item.sourceType}:${item.sourceId}`));
  const currentKeys = new Set(discovered.map((item) => `${item.sourceType}:${item.sourceId}`));
  const maxBySection = new Map<string, number>();
  for (const item of existing) if (item.sectionId) maxBySection.set(item.sectionId, Math.max(maxBySection.get(item.sectionId) || 0, item.sortOrder));
  const operations: Prisma.PrismaPromise<unknown>[] = [];
  for (const report of discovered) {
    if (keys.has(`${report.sourceType}:${report.sourceId}`)) continue;
    const next = (maxBySection.get(report.sectionId) || 0) + 10; maxBySection.set(report.sectionId, next);
    operations.push(prisma.achievementPortfolioItem.create({ data: { id: portfolioReportItemId(portfolioId, report.sourceType, report.sourceId), portfolioId, sectionId: report.sectionId, sourceType: report.sourceType, sourceId: report.sourceId, title: report.title, isVisible: true, sortOrder: next, metadataJson: json({ sectionKey: report.sectionKey, serviceName: report.serviceName, evidencePreferences: {}, unavailable: false }) } }));
  }
  for (const item of existing) {
    if (!item.sourceId) continue;
    const unavailable = !currentKeys.has(`${item.sourceType}:${item.sourceId}`);
    const meta = object(item.metadataJson);
    if (meta.unavailable !== unavailable) operations.push(prisma.achievementPortfolioItem.update({ where: { id: item.id }, data: { metadataJson: json({ ...meta, unavailable }) } }));
  }
  if (operations.length) await prisma.$transaction(operations);
  return { created: discovered.filter((item) => !keys.has(`${item.sourceType}:${item.sourceId}`)).length };
}

export async function setPortfolioReportVisibility(user: PortfolioActor, portfolioId: string, itemId: string, isVisible: boolean) {
  const item = await ensureManagedReportItem(user, portfolioId, itemId);
  await prisma.achievementPortfolioItem.update({ where: { id: item.id }, data: { isVisible } });
}

export async function movePortfolioReport(user: PortfolioActor, portfolioId: string, itemId: string, direction: "up" | "down") {
  const item = await ensureManagedReportItem(user, portfolioId, itemId);
  await syncPortfolioReports(user, portfolioId);
  const items = await prisma.achievementPortfolioItem.findMany({ where: { portfolioId, sectionId: item.sectionId, sourceType: { in: ["GUIDANCE_REPORT", "REPORT_SNAPSHOT"] } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const index = items.findIndex((entry) => entry.id === item.id); const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
  await prisma.$transaction(items.map((entry, order) => prisma.achievementPortfolioItem.update({ where: { id: entry.id }, data: { sortOrder: (order + 1) * 10 } })));
}

async function reportAndEvidence(user: PortfolioActor, portfolioId: string, itemId: string, evidenceId: string) {
  const item = await ensureManagedReportItem(user, portfolioId, itemId);
  const reports = await discoverEligiblePortfolioReports(user, portfolioId);
  const report = reports.find((entry) => entry.sourceId === item.sourceId && entry.sourceType === item.sourceType);
  if (!report) throw new PortfolioServiceError(404, "التقرير غير متاح.");
  if (!report.content.evidenceItems.some((entry) => entry.id === evidenceId)) throw new PortfolioServiceError(404, "الشاهد غير موجود في هذا التقرير.");
  return { item, report };
}

export async function updatePortfolioEvidencePreference(user: PortfolioActor, portfolioId: string, itemId: string, evidenceId: string, patch: Partial<PortfolioEvidencePreference>) {
  const { item, report } = await reportAndEvidence(user, portfolioId, itemId, evidenceId);
  const meta = object(item.metadataJson); const prefs = evidencePreferences(meta); const current = object(prefs[evidenceId]);
  const defaultOrder = (report.content.evidenceItems.findIndex((entry) => entry.id === evidenceId) + 1) * 10;
  prefs[evidenceId] = { isVisible: current.isVisible !== false, sortOrder: typeof current.sortOrder === "number" ? current.sortOrder : defaultOrder, customTitle: typeof current.customTitle === "string" ? current.customTitle : "", customDescription: typeof current.customDescription === "string" ? current.customDescription : "", ...patch };
  await prisma.achievementPortfolioItem.update({ where: { id: item.id }, data: { metadataJson: json({ ...meta, evidencePreferences: prefs }) } });
}

export async function movePortfolioEvidence(user: PortfolioActor, portfolioId: string, itemId: string, evidenceId: string, direction: "up" | "down") {
  const { item, report } = await reportAndEvidence(user, portfolioId, itemId, evidenceId);
  const managed = manageEvidence(report.content, item.metadataJson); const index = managed.findIndex((entry) => entry.id === evidenceId); const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= managed.length) return;
  [managed[index], managed[target]] = [managed[target], managed[index]];
  const meta = object(item.metadataJson); const prefs = evidencePreferences(meta);
  managed.forEach((entry, order) => { const current = object(prefs[entry.id]); prefs[entry.id] = { ...current, isVisible: entry.isVisible, sortOrder: (order + 1) * 10, customTitle: entry.title === entry.originalTitle ? "" : entry.title, customDescription: entry.description }; });
  await prisma.achievementPortfolioItem.update({ where: { id: item.id }, data: { metadataJson: json({ ...meta, evidencePreferences: prefs }) } });
}

export async function loadCustomEvidence(user: PortfolioActor, portfolioId: string): Promise<PortfolioCustomEvidence[]> {
  await requireOwnedPortfolio(user, portfolioId);
  const items = await prisma.achievementPortfolioItem.findMany({ where: { portfolioId, sourceType: "CUSTOM_EVIDENCE" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return items.map((item) => { const meta = object(item.metadataJson); return { id: item.id, sectionId: item.sectionId, title: item.title, description: item.description || "", fileUrl: typeof meta.fileUrl === "string" ? meta.fileUrl : "", mimeType: typeof meta.mimeType === "string" ? meta.mimeType : "", sortOrder: item.sortOrder, isVisible: item.isVisible }; });
}

async function validateCustomSection(portfolioId: string, sectionId?: string | null) {
  if (!sectionId) return null;
  const section = await prisma.achievementPortfolioSection.findFirst({ where: { id: sectionId, portfolioId } });
  if (!section) throw new PortfolioServiceError(404, "القسم المحدد غير موجود."); return section.id;
}

export async function createCustomEvidence(user: PortfolioActor, portfolioId: string, input: { title: string; description: string; fileUrl: string; mimeType: string; sectionId?: string | null; isVisible: boolean }) {
  await requireOwnedPortfolio(user, portfolioId); const sectionId = await validateCustomSection(portfolioId, input.sectionId);
  const last = await prisma.achievementPortfolioItem.findFirst({ where: { portfolioId, sourceType: "CUSTOM_EVIDENCE" }, orderBy: { sortOrder: "desc" } });
  return prisma.achievementPortfolioItem.create({ data: { portfolioId, sectionId, sourceType: "CUSTOM_EVIDENCE", title: input.title, description: input.description || null, isVisible: input.isVisible, sortOrder: (last?.sortOrder || 0) + 10, metadataJson: json({ fileUrl: input.fileUrl, mimeType: input.mimeType }) } });
}

async function customItem(user: PortfolioActor, portfolioId: string, itemId: string) { await requireOwnedPortfolio(user, portfolioId); const item = await prisma.achievementPortfolioItem.findFirst({ where: { id: itemId, portfolioId, sourceType: "CUSTOM_EVIDENCE" } }); if (!item) throw new PortfolioServiceError(404, "الشاهد المستقل غير موجود."); return item; }
export async function updateCustomEvidence(user: PortfolioActor, portfolioId: string, itemId: string, input: Partial<{ title: string; description: string; fileUrl: string; mimeType: string; sectionId: string | null; isVisible: boolean }>) { const item = await customItem(user, portfolioId, itemId); const sectionId = input.sectionId === undefined ? item.sectionId : await validateCustomSection(portfolioId, input.sectionId); const meta = object(item.metadataJson); return prisma.achievementPortfolioItem.update({ where: { id: item.id }, data: { sectionId, title: input.title ?? item.title, description: input.description ?? item.description, isVisible: input.isVisible ?? item.isVisible, metadataJson: json({ ...meta, fileUrl: input.fileUrl ?? meta.fileUrl ?? "", mimeType: input.mimeType ?? meta.mimeType ?? "" }) } }); }
export async function deleteCustomEvidence(user: PortfolioActor, portfolioId: string, itemId: string) { const item = await customItem(user, portfolioId, itemId); await prisma.achievementPortfolioItem.delete({ where: { id: item.id } }); }
export async function moveCustomEvidence(user: PortfolioActor, portfolioId: string, itemId: string, direction: "up" | "down") { const item = await customItem(user, portfolioId, itemId); const items = await prisma.achievementPortfolioItem.findMany({ where: { portfolioId, sourceType: "CUSTOM_EVIDENCE" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }); const index = items.findIndex((entry) => entry.id === item.id); const target = direction === "up" ? index - 1 : index + 1; if (target < 0 || target >= items.length) return; [items[index], items[target]] = [items[target], items[index]]; await prisma.$transaction(items.map((entry, order) => prisma.achievementPortfolioItem.update({ where: { id: entry.id }, data: { sortOrder: (order + 1) * 10 } }))); }
