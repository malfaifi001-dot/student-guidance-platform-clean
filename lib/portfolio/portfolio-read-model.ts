import { prisma } from "@/lib/prisma";
import { getPortfolioTheme } from "@/lib/portfolio/portfolio-theme-registry";
import { getPortfolioDefaultSectionOrderForRole, shouldShowPortfolioWeights } from "@/lib/portfolio/portfolio-performance-elements";
import { loadCustomEvidence, loadManagedPortfolioReports } from "@/lib/portfolio/portfolio-report-service";
import { loadPortfolioForUser, readBiography, readEducationIdentity, readPortfolioSettings } from "@/lib/portfolio/portfolio-service";
import { getPortfolioRoutes } from "@/lib/portfolio/portfolio-routes";
import type { PortfolioItemType, PortfolioReportGroup } from "@/lib/portfolio/portfolio-types";
import { resolvePortfolioServiceOutputs } from "@/lib/portfolio/service-outputs/service-output-registry";

type PortfolioCurrentUser = {
  id: string;
  role?: string | null;
  name?: string | null;
  officialName?: string | null;
  jobTitle?: string | null;
  schoolAccountId?: string | null;
};

function ownerName(user: PortfolioCurrentUser) {
  const fallback = user.role === "TEACHER" ? "المعلم" : user.role === "COUNSELOR" ? "الموجه الطلابي" : user.role === "ACTIVITY_LEADER" ? "رائد النشاط" : user.role === "PRINCIPAL" ? "مدير المدرسة" : "مستخدم المنصة";
  return user.officialName || user.name || fallback;
}

function metadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function getPortfolioWorkspace(
  user: PortfolioCurrentUser,
  portfolioId?: string | null,
) {
  if (!user.schoolAccountId) return { ok: false as const, reason: "NO_SCHOOL" };

  const portfolio = await loadPortfolioForUser(user, portfolioId);
  const [school, sections, qualificationItems, managedReports, customEvidence, linkedOutputs] = await Promise.all([
    prisma.schoolAccount.findUnique({
      where: { id: user.schoolAccountId },
      include: { profile: true },
    }),
    prisma.achievementPortfolioSection.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.achievementPortfolioItem.findMany({
      where: {
        portfolioId: portfolio.id,
        sourceType: { in: ["QUALIFICATION", "COURSE", "CERTIFICATE"] },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    loadManagedPortfolioReports(user, portfolio.id),
    loadCustomEvidence(user, portfolio.id),
    ["TEACHER", "COUNSELOR", "ACTIVITY_LEADER", "PRINCIPAL"].includes(String(user.role))
      ? resolvePortfolioServiceOutputs({ ownerUserId: user.id, schoolAccountId: user.schoolAccountId, roleKey: user.role as "TEACHER" | "COUNSELOR" | "ACTIVITY_LEADER" | "PRINCIPAL" })
      : Promise.resolve([]),
  ]);

  const sectionDefinitions = getPortfolioDefaultSectionOrderForRole(user.role);
  const definitionByKey = new Map(sectionDefinitions.map((definition) => [definition.key, definition]));
  const storedByKey = new Map(sections.map((section) => [section.sectionKey, section]));
  const unifiedSections = sectionDefinitions
    .map((definition) => {
      const stored = storedByKey.get(definition.key);
      if (!stored) return null;
      return {
        id: stored.id,
        key: definition.key,
        kind: definition.kind,
        title: definition.title,
        introText: user.role !== "TEACHER" && definition.key === "profile" && stored.introText?.includes("المعلم") ? definition.intro : stored.introText || definition.intro,
        sortOrder: stored.sortOrder,
        isEnabled: stored.isEnabled,
      };
    })
    .filter((section): section is NonNullable<typeof section> => Boolean(section))
    .sort((first, second) => first.sortOrder - second.sortOrder);

  const performanceSections = unifiedSections.flatMap((section) => {
    const definition = definitionByKey.get(section.key);
    if (!definition?.service) return [];
    const reports = managedReports
      .filter((report) => report.sectionKey === section.key && report.isVisible && report.isAvailable)
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map((report) => ({
        id: report.sourceId,
        itemId: report.itemId,
        title: report.title,
        status: report.status,
        generatedAt: report.generatedAt,
        createdAt: report.createdAt,
        evidenceCount: report.evidence.filter((item) => item.isVisible && item.url).length,
        caseTitle: report.caseTitle,
        serviceName: report.serviceName,
        previewUrl: report.previewUrl,
        sourceType: report.sourceType,
        content: report.content,
      }));
    return {
      ...definition.service,
      id: section.id,
      sortOrder: section.sortOrder,
      isEnabled: section.isEnabled,
      intro: section.introText,
      linkedOutputs: linkedOutputs.filter((output) => output.performanceItemKey === section.key),
      reports,
    };
  });

  const reportGroups: PortfolioReportGroup[] = performanceSections.map((section) => {
    const reports = managedReports
      .filter((report) => report.sectionKey === section.key)
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map(({ content: _content, ...report }) => report);
    return {
      sectionId: section.id,
      sectionKey: section.key,
      title: section.title,
      weight: section.weight,
      isEnabled: section.isEnabled,
      availableCount: reports.filter((report) => report.isAvailable).length,
      includedCount: reports.filter((report) => report.isAvailable && report.isVisible).length,
      visibleEvidenceCount: reports.reduce(
        (total, report) => total + report.evidence.filter((item) => item.isVisible).length,
        0,
      ),
      linkedOutputs: section.linkedOutputs,
      linkedOutputCount: section.linkedOutputs.length,
      reports,
    };
  });

  const totalReports = performanceSections.reduce((sum, section) => sum + section.reports.length, 0);
  const totalEvidences = performanceSections.reduce(
    (sum, section) => sum + section.reports.reduce((count, report) => count + report.evidenceCount, 0),
    0,
  );
  const settings = readPortfolioSettings(portfolio.settingsJson);
  const profileSection = sections.find((section) => section.sectionKey === "profile");
  const introductionSection = sections.find((section) => section.sectionKey === "introduction");

  return {
    ok: true as const,
    portfolio: {
      id: portfolio.id,
      title: user.role === "COUNSELOR" ? "ملف الإنجاز" : portfolio.title,
      academicYear: portfolio.academicYear,
      term: portfolio.term,
      themeId: getPortfolioTheme(portfolio.themeId).id,
      status: portfolio.status,
      introText: portfolio.introText || "",
      conclusionText: portfolio.conclusionText || "",
      bioText: portfolio.bioText || "",
      description: settings.description,
      preferences: settings.preferences,
    },
    owner: { name: ownerName(user), jobTitle: user.jobTitle || (user.role === "TEACHER" ? "معلم" : user.role === "COUNSELOR" ? "موجه طلابي" : user.role === "ACTIVITY_LEADER" ? "رائد النشاط" : user.role === "PRINCIPAL" ? "مدير المدرسة" : "مستخدم المنصة") },
    showWeights: shouldShowPortfolioWeights(user.role),
    routes: getPortfolioRoutes(user.role),
    school: {
      name: school?.profile?.schoolName || school?.name || "المدرسة",
      logoUrl: school?.profile?.logoUrl || null,
      principalName: school?.profile?.principalName || null,
      academicYear: school?.profile?.academicYear || null,
      currentSemester: school?.profile?.currentSemester || null,
    },
    sections: unifiedSections,
    biography: readBiography(profileSection?.metadataJson),
    educationIdentity: readEducationIdentity(introductionSection?.metadataJson, user.role),
    qualificationItems: qualificationItems.map((item) => {
      const meta = metadata(item.metadataJson);
      return {
        id: item.id,
        type: item.sourceType as PortfolioItemType,
        title: item.title,
        issuer: typeof meta.issuer === "string" ? meta.issuer : "",
        date: typeof meta.date === "string" ? meta.date : "",
        hours: typeof meta.hours === "string" ? meta.hours : "",
        description: item.description || "",
        attachmentUrl: typeof meta.attachmentUrl === "string" ? meta.attachmentUrl : "",
        attachmentMimeType: (meta.attachmentMimeType === "image/jpeg" || meta.attachmentMimeType === "image/png" || meta.attachmentMimeType === "image/webp" ? meta.attachmentMimeType : "") as "image/jpeg" | "image/png" | "image/webp" | "",
        attachmentKind: meta.attachmentKind === "IMAGE" || (typeof meta.attachmentUrl === "string" && /\.(?:jpe?g|png|webp)$/i.test(meta.attachmentUrl)) ? "IMAGE" as const : "" as const,
        sortOrder: item.sortOrder,
        isVisible: item.isVisible,
      };
    }),
    reportGroups,
    customEvidence,
    performanceSections,
    totals: { reports: totalReports, evidences: totalEvidences, sections: unifiedSections.length },
  };
}

export type PortfolioWorkspaceData = Extract<
  Awaited<ReturnType<typeof getPortfolioWorkspace>>,
  { ok: true }
>;
