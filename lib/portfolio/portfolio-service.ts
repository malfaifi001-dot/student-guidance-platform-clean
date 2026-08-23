import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  assertPortfolioActor,
  PortfolioServiceError,
  requireOwnedPortfolio,
  type PortfolioActor,
} from "@/lib/portfolio/portfolio-authorization";
import { getPortfolioDefaultSectionOrderForRole } from "@/lib/portfolio/portfolio-performance-elements";
import { DEFAULT_PORTFOLIO_THEME_ID } from "@/lib/portfolio/portfolio-theme-registry";
import type {
  PortfolioBiography,
  PortfolioEducationIdentity,
  PortfolioPreferences,
} from "@/lib/portfolio/portfolio-types";

export const DEFAULT_PORTFOLIO_PREFERENCES: PortfolioPreferences = {
  showSchoolName: true,
  showPrincipalName: true,
  showCoverStatistics: true,
  showTableOfContents: true,
  showPerformanceDividers: true,
};

export const EMPTY_PORTFOLIO_BIOGRAPHY: PortfolioBiography = {
  professionalSummary: "",
  specialization: "",
  academicQualification: "",
  yearsOfExperience: "",
  skills: "",
  professionalInterests: "",
};

export const DEFAULT_PORTFOLIO_EDUCATION_IDENTITY: PortfolioEducationIdentity = {
  vision: "تحقيق تعليم شامل للجميع يعزز القيم والمعرفة في بيئة تنافسية عالمية، ويمكّن الأفراد والمجتمعات من اكتساب مهارات ذات جودة عالية.",
  mission: "تقديم تعليم ذي جودة عالية وكفاءة يعزز القيم، ومتاح للجميع، ضمن بيئة آمنة ومحفزة لإعداد أفراد فاعلين في المجتمع ومساهمين في تنمية وطن رائد عالميًا.",
  pillars: ["التعليم للجميع", "رحلة التعلم", "جودة التعليم", "الاستدامة المالية", "التميز المؤسسي"],
  values: ["الجودة", "الالتزام", "الإبداع", "روح الفريق", "التعلم المستمر"],
  strategicObjectives: [
    "ضمان وصول التعليم للجميع",
    "تطوير بيئة مدرسية آمنة وابتكارية",
    "تعزيز القيم والهوية الوطنية",
    "تحسين تجربة المستفيدين",
    "الاستثمار في الطالب والمعلم والأسر بالإبداع",
    "تحسين أداء المدارس وتعزيز شراكتها مع المجتمع",
    "رفع كفاءة الإنفاق وتعزيز الاستدامة المالية",
    "تطوير كفاءات الموارد البشرية وتعزيز الثقافة المؤسسية",
    "الارتقاء بمستوى التجربة الرقمية",
    "تعزيز الحوكمة والالتزام وإدارة المخاطر",
  ],
};

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function defaultAcademicYear() {
  return String(new Date().getFullYear());
}

const defaultTerm = "الفصل الدراسي الأول";

function ownerName(user: PortfolioActor & { name?: string | null; officialName?: string | null }) {
  const fallback = user.role === "TEACHER" ? "المعلم" : user.role === "COUNSELOR" ? "الموجه الطلابي" : user.role === "ACTIVITY_LEADER" ? "رائد النشاط" : user.role === "PRINCIPAL" ? "مدير المدرسة" : "مستخدم المنصة";
  return user.officialName || user.name || fallback;
}

function defaultSections(role?: string | null) {
  return getPortfolioDefaultSectionOrderForRole(role).map((section) => ({
    kind: section.kind,
    sectionKey: section.key,
    title: section.title,
    introText: section.intro,
    sortOrder: section.defaultSortOrder,
    ...(section.service ? { metadataJson: asJson({ serviceSlug: section.service.serviceSlug, weight: section.service.weight }) } : {}),
  }));
}

export async function ensureDefaultPortfolio(
  user: PortfolioActor & { name?: string | null; officialName?: string | null },
) {
  assertPortfolioActor(user);
  const academicYear = defaultAcademicYear();
  const existing = await prisma.achievementPortfolio.findUnique({
    where: {
      schoolAccountId_ownerUserId_academicYear_term: {
        schoolAccountId: user.schoolAccountId!,
        ownerUserId: user.id,
        academicYear,
        term: defaultTerm,
      },
    },
  });
  if (existing) {
    await ensurePortfolioRoleSections(existing.id, user.role);
    return existing;
  }

  return prisma.achievementPortfolio.create({
    data: {
      schoolAccountId: user.schoolAccountId!,
      ownerUserId: user.id,
      title: user.role === "COUNSELOR" ? "ملف الإنجاز" : `ملف إنجاز ${ownerName(user)}`,
      roleKey: user.role,
      academicYear,
      term: defaultTerm,
      themeId: DEFAULT_PORTFOLIO_THEME_ID,
      introText: "يعرض هذا الملف أبرز الأعمال والتقارير والشواهد المهنية خلال الفصل الدراسي.",
      conclusionText: "ختامًا، يمثل هذا الملف توثيقًا مختصرًا لأبرز الإنجازات وفرص التطوير القادمة.",
      bioText: "",
      settingsJson: asJson({ preferences: DEFAULT_PORTFOLIO_PREFERENCES, description: "" }),
      sections: { create: defaultSections(user.role) },
    },
  });
}

async function ensurePortfolioRoleSections(portfolioId: string, role?: string | null) {
  const definitions = getPortfolioDefaultSectionOrderForRole(role);
  const existing = await prisma.achievementPortfolioSection.findMany({
    where: { portfolioId, sectionKey: { in: definitions.map((item) => item.key) } },
    select: { sectionKey: true },
  });
  const existingKeys = new Set(existing.map((item) => item.sectionKey));
  const missing = definitions.filter((item) => !existingKeys.has(item.key));
  if (missing.length) {
    await prisma.achievementPortfolioSection.createMany({
      data: missing.map((section) => ({
        portfolioId,
        kind: section.kind,
        sectionKey: section.key,
        title: section.title,
        introText: section.intro,
        sortOrder: section.defaultSortOrder,
        ...(section.service ? { metadataJson: asJson({ serviceSlug: section.service.serviceSlug, weight: section.service.weight }) } : {}),
      })),
    });
  }

  // This section was introduced before its final position was established.
  // Keep existing Activity Leader portfolios aligned with the role definition.
  if (role === "ACTIVITY_LEADER") {
    const studentActivity = definitions.find((section) => section.key === "student_activity");
    if (studentActivity) {
      await prisma.achievementPortfolioSection.updateMany({
        where: { portfolioId, sectionKey: studentActivity.key },
        data: { sortOrder: studentActivity.defaultSortOrder },
      });
    }
  }
}

export async function loadPortfolioForUser(
  user: PortfolioActor & { name?: string | null; officialName?: string | null },
  portfolioId?: string | null,
) {
  const portfolio = portfolioId ? await requireOwnedPortfolio(user, portfolioId) : await ensureDefaultPortfolio(user);
  await ensurePortfolioRoleSections(portfolio.id, user.role);
  return portfolio;
}

export async function listPortfolioSectionTargets(
  user: PortfolioActor & { name?: string | null; officialName?: string | null },
  roleKey: string,
) {
  const portfolio = roleKey === user.role
    ? await loadPortfolioForUser(user)
    : await prisma.achievementPortfolio.findFirst({
      where: { ownerUserId: user.id, schoolAccountId: user.schoolAccountId || undefined, roleKey },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
  if (!portfolio) return [];
  return prisma.achievementPortfolioSection.findMany({
    where: { portfolioId: portfolio.id, isEnabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { sectionKey: true, title: true, kind: true },
  }).then((sections) => sections.map((section) => ({
    key: section.sectionKey,
    title: section.title,
    kind: section.kind,
  })));
}

export function readPortfolioSettings(value: unknown) {
  const settings = jsonObject(value);
  const preferences = jsonObject(settings.preferences);
  return {
    description: typeof settings.description === "string" ? settings.description : "",
    preferences: {
      ...DEFAULT_PORTFOLIO_PREFERENCES,
      ...Object.fromEntries(
        Object.entries(preferences).filter(([, item]) => typeof item === "boolean"),
      ),
    } as PortfolioPreferences,
  };
}

export function readBiography(value: unknown): PortfolioBiography {
  const metadata = jsonObject(value);
  const biography = jsonObject(metadata.biography);
  return Object.fromEntries(
    Object.keys(EMPTY_PORTFOLIO_BIOGRAPHY).map((key) => [key, typeof biography[key] === "string" ? biography[key] : ""]),
  ) as PortfolioBiography;
}

export function readEducationIdentity(value: unknown, role?: string | null): PortfolioEducationIdentity {
  const metadata = jsonObject(value);
  const stored = jsonObject(metadata.educationIdentity);
  const has = (key: keyof PortfolioEducationIdentity) => Object.prototype.hasOwnProperty.call(stored, key);
  const text = (key: "vision" | "mission") => {
    if (!has(key)) return DEFAULT_PORTFOLIO_EDUCATION_IDENTITY[key];
    return typeof stored[key] === "string" ? stored[key] : "";
  };
  const list = (key: "pillars" | "values" | "strategicObjectives") => {
    if (!has(key)) {
      const defaults = [...DEFAULT_PORTFOLIO_EDUCATION_IDENTITY[key]];
      return role === "COUNSELOR"
        ? defaults.map((item) => item.replace("الطالب والمعلم والأسر", "الطالب والأسرة والمجتمع المدرسي"))
        : defaults;
    }
    if (!Array.isArray(stored[key])) return [];
    return stored[key].filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  };
  return {
    vision: text("vision"),
    mission: text("mission"),
    pillars: list("pillars"),
    values: list("values"),
    strategicObjectives: list("strategicObjectives"),
  };
}

export async function updatePortfolioSettings(user: PortfolioActor, portfolioId: string, input: {
  title: string; academicYear: string; term: string; description: string; themeId: string; preferences: PortfolioPreferences;
}) {
  const portfolio = await requireOwnedPortfolio(user, portfolioId);
  const current = jsonObject(portfolio.settingsJson);
  return prisma.achievementPortfolio.update({
    where: { id: portfolio.id },
    data: {
      title: input.title,
      academicYear: input.academicYear,
      term: input.term,
      themeId: input.themeId,
      settingsJson: asJson({ ...current, description: input.description, preferences: input.preferences }),
    },
  });
}

export async function updatePortfolioContent(user: PortfolioActor, portfolioId: string, input: {
  introText: string; conclusionText: string; biography: PortfolioBiography; educationIdentity: PortfolioEducationIdentity;
}) {
  await requireOwnedPortfolio(user, portfolioId);
  const [profile, introduction] = await Promise.all([
    prisma.achievementPortfolioSection.findFirst({ where: { portfolioId, sectionKey: "profile" } }),
    prisma.achievementPortfolioSection.findFirst({ where: { portfolioId, sectionKey: "introduction" } }),
  ]);
  const summary = input.biography.professionalSummary;
  await prisma.$transaction([
    prisma.achievementPortfolio.update({
      where: { id: portfolioId },
      data: { introText: input.introText, conclusionText: input.conclusionText, bioText: summary },
    }),
    ...(profile ? [prisma.achievementPortfolioSection.update({
      where: { id: profile.id },
      data: { metadataJson: asJson({ ...jsonObject(profile.metadataJson), biography: input.biography }) },
    })] : []),
    introduction
      ? prisma.achievementPortfolioSection.update({
          where: { id: introduction.id },
          data: { metadataJson: asJson({ ...jsonObject(introduction.metadataJson), educationIdentity: input.educationIdentity }) },
        })
      : prisma.achievementPortfolioSection.create({
          data: {
            portfolioId,
            kind: "STATIC",
            sectionKey: "introduction",
            title: "المقدمة",
            introText: "مدخل موجز لملف الإنجاز.",
            sortOrder: 10,
            metadataJson: asJson({ educationIdentity: input.educationIdentity }),
          },
        }),
  ]);
}

async function qualificationSectionId(portfolioId: string) {
  const section = await prisma.achievementPortfolioSection.findFirst({ where: { portfolioId, sectionKey: "qualifications" } });
  if (!section) throw new PortfolioServiceError(409, "قسم المؤهلات غير مهيأ في هذا الملف.");
  return section.id;
}

function assertPortfolioAttachmentOwnership(portfolioId: string, attachmentUrl: unknown) {
  if (typeof attachmentUrl !== "string" || !attachmentUrl.startsWith("/uploads/portfolio/")) return;
  if (!attachmentUrl.startsWith(`/uploads/portfolio/${portfolioId}/`)) {
    throw new PortfolioServiceError(403, "لا يمكن إرفاق صورة مملوكة لملف إنجاز آخر.");
  }
}

export async function createPortfolioItem(user: PortfolioActor, portfolioId: string, input: Record<string, unknown> & { type: string; title: string; isVisible: boolean }) {
  await requireOwnedPortfolio(user, portfolioId);
  assertPortfolioAttachmentOwnership(portfolioId, input.attachmentUrl);
  const sectionId = await qualificationSectionId(portfolioId);
  const last = await prisma.achievementPortfolioItem.findFirst({ where: { portfolioId, sectionId }, orderBy: { sortOrder: "desc" } });
  const { type, title, isVisible, description, ...metadata } = input;
  return prisma.achievementPortfolioItem.create({ data: {
    portfolioId, sectionId, sourceType: type, title,
    description: typeof description === "string" ? description : null,
    isVisible, sortOrder: (last?.sortOrder || 0) + 10, metadataJson: asJson(metadata),
  } });
}

async function ownedItem(user: PortfolioActor, portfolioId: string, itemId: string) {
  await requireOwnedPortfolio(user, portfolioId);
  const item = await prisma.achievementPortfolioItem.findFirst({ where: { id: itemId, portfolioId } });
  if (!item) throw new PortfolioServiceError(404, "العنصر غير موجود.");
  return item;
}

export async function updatePortfolioItem(user: PortfolioActor, portfolioId: string, itemId: string, input: Record<string, unknown>) {
  const item = await ownedItem(user, portfolioId, itemId);
  assertPortfolioAttachmentOwnership(portfolioId, input.attachmentUrl);
  const metadata = { ...jsonObject(item.metadataJson), ...input };
  return prisma.achievementPortfolioItem.update({ where: { id: item.id }, data: {
    sourceType: typeof input.type === "string" ? input.type : item.sourceType,
    title: typeof input.title === "string" ? input.title : item.title,
    description: typeof input.description === "string" ? input.description : item.description,
    isVisible: typeof input.isVisible === "boolean" ? input.isVisible : item.isVisible,
    metadataJson: asJson(metadata),
  } });
}

export async function deletePortfolioItem(user: PortfolioActor, portfolioId: string, itemId: string) {
  const item = await ownedItem(user, portfolioId, itemId);
  await prisma.achievementPortfolioItem.delete({ where: { id: item.id } });
}

async function moveOrdered(ids: string[], currentIndex: number, direction: "up" | "down", update: (id: string, sortOrder: number) => Prisma.PrismaPromise<unknown>) {
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= ids.length) return;
  [ids[currentIndex], ids[targetIndex]] = [ids[targetIndex], ids[currentIndex]];
  await prisma.$transaction(ids.map((id, index) => update(id, (index + 1) * 10)));
}

export async function movePortfolioItem(user: PortfolioActor, portfolioId: string, itemId: string, direction: "up" | "down") {
  await ownedItem(user, portfolioId, itemId);
  const items = await prisma.achievementPortfolioItem.findMany({ where: { portfolioId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  await moveOrdered(items.map((item) => item.id), items.findIndex((item) => item.id === itemId), direction, (id, sortOrder) => prisma.achievementPortfolioItem.update({ where: { id }, data: { sortOrder } }));
}

export async function updatePortfolioSection(user: PortfolioActor, portfolioId: string, sectionId: string, isEnabled: boolean) {
  await requireOwnedPortfolio(user, portfolioId);
  const allowedKeys = getPortfolioDefaultSectionOrderForRole(user.role).map((section) => section.key);
  const section = await prisma.achievementPortfolioSection.findFirst({ where: { id: sectionId, portfolioId, sectionKey: { in: allowedKeys } } });
  if (!section) throw new PortfolioServiceError(404, "القسم غير موجود.");
  return prisma.achievementPortfolioSection.update({ where: { id: section.id }, data: { isEnabled } });
}

export async function movePortfolioSection(user: PortfolioActor, portfolioId: string, sectionId: string, direction: "up" | "down") {
  await requireOwnedPortfolio(user, portfolioId);
  const allowedKeys = getPortfolioDefaultSectionOrderForRole(user.role).map((section) => section.key);
  const sections = await prisma.achievementPortfolioSection.findMany({ where: { portfolioId, sectionKey: { in: allowedKeys } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const index = sections.findIndex((section) => section.id === sectionId);
  if (index < 0) throw new PortfolioServiceError(404, "القسم غير موجود.");
  await moveOrdered(sections.map((section) => section.id), index, direction, (id, sortOrder) => prisma.achievementPortfolioSection.update({ where: { id }, data: { sortOrder } }));
}

export * from "@/lib/portfolio/portfolio-report-service";
