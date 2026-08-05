import { prisma } from "@/lib/prisma";
import { getPortfolioTheme } from "@/lib/portfolio/portfolio-theme-registry";
import { TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS } from "@/lib/portfolio/portfolio-performance-elements";
import { loadCustomEvidence, loadManagedPortfolioReports } from "@/lib/portfolio/portfolio-report-service";
import { loadPortfolioForUser, readBiography, readEducationIdentity, readPortfolioSettings } from "@/lib/portfolio/portfolio-service";
import type { PortfolioItemType, PortfolioReportGroup } from "@/lib/portfolio/portfolio-types";

type PortfolioCurrentUser = {
  id: string;
  role?: string | null;
  name?: string | null;
  officialName?: string | null;
  jobTitle?: string | null;
  schoolAccountId?: string | null;
};

function ownerName(user: PortfolioCurrentUser) {
  return user.officialName || user.name || "المعلم";
}

function metadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function getTeacherPortfolioWorkspace(
  user: PortfolioCurrentUser,
  portfolioId?: string | null,
) {
  if (!user.schoolAccountId) return { ok: false as const, reason: "NO_SCHOOL" };

  const portfolio = await loadPortfolioForUser(user, portfolioId);
  const [school, sections, qualificationItems, managedReports, customEvidence] = await Promise.all([
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
  ]);

  const performanceSections = TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS.map((definition) => {
    const stored = sections.find((section) => section.sectionKey === definition.key);
    const reports = managedReports
      .filter((report) => report.sectionKey === definition.key && report.isVisible && report.isAvailable)
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
      ...definition,
      id: stored?.id || definition.key,
      sortOrder: stored?.sortOrder ?? 0,
      isEnabled: stored?.isEnabled ?? true,
      intro: stored?.introText || definition.intro,
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
      title: portfolio.title,
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
    owner: { name: ownerName(user), jobTitle: user.jobTitle || "معلم" },
    school: {
      name: school?.profile?.schoolName || school?.name || "المدرسة",
      logoUrl: school?.profile?.logoUrl || null,
      principalName: school?.profile?.principalName || null,
      academicYear: school?.profile?.academicYear || null,
      currentSemester: school?.profile?.currentSemester || null,
    },
    sections: sections.map((section) => ({
      id: section.id,
      key: section.sectionKey,
      kind: section.kind,
      title: section.title,
      introText: section.introText || "",
      sortOrder: section.sortOrder,
      isEnabled: section.isEnabled,
    })),
    biography: readBiography(profileSection?.metadataJson),
    educationIdentity: readEducationIdentity(introductionSection?.metadataJson),
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
    totals: { reports: totalReports, evidences: totalEvidences, sections: sections.length },
  };
}

export type TeacherPortfolioWorkspace = Extract<
  Awaited<ReturnType<typeof getTeacherPortfolioWorkspace>>,
  { ok: true }
>;
