import { prisma } from "@/lib/prisma";
import {
  TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS,
  TEACHER_PORTFOLIO_SERVICE_SLUGS,
} from "@/lib/portfolio/portfolio-performance-elements";
import { DEFAULT_PORTFOLIO_THEME_ID } from "@/lib/portfolio/portfolio-theme-registry";
import {
  normalizePortfolioReportPayload,
  type PortfolioReportContent,
} from "@/lib/portfolio/portfolio-report-content";

type PortfolioCurrentUser = {
  id: string;
  role?: string | null;
  name?: string | null;
  officialName?: string | null;
  jobTitle?: string | null;
  schoolAccountId?: string | null;
};

type PortfolioReportItem = {
  id: string;
  title: string;
  status: string;
  generatedAt: string | null;
  createdAt: string;
  evidenceCount: number;
  caseTitle: string | null;
  serviceName: string;
  previewUrl: string;
  sourceType: "GUIDANCE_REPORT" | "REPORT_SNAPSHOT";
  content: PortfolioReportContent | null;
};

function getDefaultAcademicYear() {
  return String(new Date().getFullYear());
}

function getDefaultTerm() {
  return "الفصل الدراسي الأول";
}

function getOwnerDisplayName(user: PortfolioCurrentUser) {
  return user.officialName || user.name || "المعلم";
}

async function ensureTeacherPortfolio(user: PortfolioCurrentUser) {
  if (!user.schoolAccountId) throw new Error("حساب المدرسة غير مكتمل.");

  const academicYear = getDefaultAcademicYear();
  const term = getDefaultTerm();

  const existing = await prisma.achievementPortfolio.findUnique({
    where: {
      schoolAccountId_ownerUserId_academicYear_term: {
        schoolAccountId: user.schoolAccountId,
        ownerUserId: user.id,
        academicYear,
        term,
      },
    },
  });

  if (existing) return existing;

  return prisma.achievementPortfolio.create({
    data: {
      schoolAccountId: user.schoolAccountId,
      ownerUserId: user.id,
      title: `ملف إنجاز ${getOwnerDisplayName(user)}`,
      roleKey: "TEACHER",
      academicYear,
      term,
      themeId: DEFAULT_PORTFOLIO_THEME_ID,
      introText:
        "يعرض هذا الملف أبرز الأعمال والتقارير والشواهد المهنية خلال الفصل الدراسي.",
      conclusionText:
        "ختامًا، يمثل هذا الملف توثيقًا مختصرًا لأبرز الإنجازات وفرص التطوير القادمة.",
      bioText: "",
      sections: {
        create: [
          {
            kind: "STATIC",
            sectionKey: "introduction",
            title: "المقدمة",
            introText: "مدخل موجز لملف الإنجاز.",
            sortOrder: 10,
          },
          {
            kind: "STATIC",
            sectionKey: "profile",
            title: "السيرة المهنية",
            introText: "نبذة مختصرة عن المعلم وخبراته.",
            sortOrder: 20,
          },
          {
            kind: "STATIC",
            sectionKey: "qualifications",
            title: "المؤهلات والدورات",
            introText: "المؤهلات العلمية والدورات والشهادات.",
            sortOrder: 30,
          },
          ...TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS.map((element, index) => ({
            kind: "PERFORMANCE_ELEMENT",
            sectionKey: element.key,
            title: element.title,
            introText: element.intro,
            sortOrder: 100 + index * 10,
            metadataJson: {
              serviceSlug: element.serviceSlug,
              weight: element.weight,
            },
          })),
          {
            kind: "STATIC",
            sectionKey: "closing",
            title: "الخاتمة",
            introText: "خاتمة مختصرة لملف الإنجاز.",
            sortOrder: 1000,
          },
        ],
      },
    },
  });
}

function pushReport(
  map: Map<string, PortfolioReportItem[]>,
  serviceSlug: string | null | undefined,
  report: PortfolioReportItem,
) {
  const cleanSlug = String(serviceSlug || "").trim();
  if (!cleanSlug) return;

  const items = map.get(cleanSlug) || [];
  if (items.some((item) => item.id === report.id && item.sourceType === report.sourceType)) {
    return;
  }

  items.push(report);
  map.set(cleanSlug, items);
}

export async function getTeacherPortfolioWorkspace(user: PortfolioCurrentUser) {
  if (!user.schoolAccountId) {
    return {
      ok: false as const,
      reason: "NO_SCHOOL",
    };
  }

  const portfolio = await ensureTeacherPortfolio(user);
  const ownedCaseIds = await prisma.caseEntry.findMany({
    where: {
      schoolAccountId: user.schoolAccountId,
      createdById: user.id,
      service: { slug: { in: TEACHER_PORTFOLIO_SERVICE_SLUGS } },
    },
    select: { id: true },
  });

  const [school, sections, guidanceReports, activeReportTwos, reportSnapshots] = await Promise.all([
    prisma.schoolAccount.findUnique({
      where: { id: user.schoolAccountId },
      include: { profile: true },
    }),

    prisma.achievementPortfolioSection.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { sortOrder: "asc" },
    }),

    prisma.guidanceReport.findMany({
      where: {
        serviceSlug: { in: TEACHER_PORTFOLIO_SERVICE_SLUGS },
        caseEntry: {
          schoolAccountId: user.schoolAccountId,
          createdById: user.id,
        },
      },
      include: {
        caseEntry: { include: { service: true } },
        evidenceItems: {
          where: { visible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),

    prisma.reportTwoActive.findMany({
      where: {
        caseEntryId: { in: ownedCaseIds.map((item) => item.id) },
        schoolAccountId: user.schoolAccountId,
        serviceSlug: { in: TEACHER_PORTFOLIO_SERVICE_SLUGS },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),

    prisma.reportSnapshot.findMany({
      where: {
        schoolAccountId: user.schoolAccountId,
        serviceSlug: { in: TEACHER_PORTFOLIO_SERVICE_SLUGS },
      },
      orderBy: { approvedAt: "desc" },
      take: 200,
    }),
  ]);

  const reportsByServiceSlug = new Map<string, PortfolioReportItem[]>();

  for (const report of guidanceReports) {
    pushReport(reportsByServiceSlug, report.serviceSlug, {
      id: report.id,
      title: report.title,
      status: report.status,
      generatedAt: report.generatedAt?.toISOString() || null,
      createdAt: report.createdAt.toISOString(),
      evidenceCount: report.evidenceItems.length,
      caseTitle: report.caseEntry?.title || null,
      serviceName: report.caseEntry?.service?.name || report.serviceSlug,
      previewUrl: `/dashboard/report/${report.id}/preview`,
      sourceType: "GUIDANCE_REPORT",
      content: null,
    });
  }

  for (const report of activeReportTwos) {
    if (report.status !== "APPROVED") continue;

    const content = normalizePortfolioReportPayload(report.sourcePayload);
    pushReport(reportsByServiceSlug, report.serviceSlug, {
      id: report.id,
      title: content?.title || report.reportTitle,
      status: report.status,
      generatedAt: (report.approvedAt || report.savedAt).toISOString(),
      createdAt: report.createdAt.toISOString(),
      evidenceCount: content?.evidenceItems.length || 0,
      caseTitle: null,
      serviceName: content?.serviceName || report.serviceName || report.serviceSlug || "تقرير",
      previewUrl: `/dashboard/report-2/snapshots/${report.id}/preview`,
      sourceType: "REPORT_SNAPSHOT",
      content,
    });
  }

  const activeReportIds = new Set(activeReportTwos.map((report) => report.id));
  for (const snapshot of reportSnapshots) {
    if (activeReportIds.has(snapshot.id)) continue;
    const content = normalizePortfolioReportPayload(snapshot.snapshotPayload);

    pushReport(reportsByServiceSlug, snapshot.serviceSlug, {
      id: snapshot.id,
      title: content?.title || snapshot.reportTitle,
      status: "APPROVED",
      generatedAt: snapshot.approvedAt.toISOString(),
      createdAt: snapshot.createdAt.toISOString(),
      evidenceCount: content?.evidenceItems.length || 0,
      caseTitle: null,
      serviceName: content?.serviceName || snapshot.serviceName || snapshot.serviceSlug || "تقرير",
      previewUrl: `/dashboard/report-2/snapshots/${snapshot.id}/preview`,
      sourceType: "REPORT_SNAPSHOT",
      content,
    });
  }

  for (const items of reportsByServiceSlug.values()) {
    items.sort((first, second) => {
      const firstDate = new Date(first.generatedAt || first.createdAt).getTime();
      const secondDate = new Date(second.generatedAt || second.createdAt).getTime();
      return secondDate - firstDate;
    });
  }

  const performanceSections = TEACHER_PORTFOLIO_PERFORMANCE_ELEMENTS.map(
    (element) => ({
      ...element,
      reports: reportsByServiceSlug.get(element.serviceSlug) || [],
    }),
  );

  const totalReports = performanceSections.reduce(
    (total, section) => total + section.reports.length,
    0,
  );

  const totalEvidences = performanceSections.reduce(
    (total, section) =>
      total +
      section.reports.reduce(
        (sectionTotal, report) => sectionTotal + report.evidenceCount,
        0,
      ),
    0,
  );

  return {
    ok: true as const,
    portfolio: {
      id: portfolio.id,
      title: portfolio.title,
      academicYear: portfolio.academicYear,
      term: portfolio.term,
      themeId: portfolio.themeId,
      status: portfolio.status,
      introText: portfolio.introText || "",
      conclusionText: portfolio.conclusionText || "",
      bioText: portfolio.bioText || "",
    },
    owner: {
      name: getOwnerDisplayName(user),
      jobTitle: user.jobTitle || "معلم",
    },
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
    performanceSections,
    totals: {
      reports: totalReports,
      evidences: totalEvidences,
      sections: sections.length,
    },
  };
}
