import { z } from "zod";
import { PORTFOLIO_THEME_IDS } from "@/lib/portfolio/portfolio-theme-registry";
import type { PortfolioServiceOutput } from "@/lib/portfolio/service-outputs/service-output-types";

export const portfolioItemTypes = ["QUALIFICATION", "COURSE", "CERTIFICATE"] as const;
export type PortfolioItemType = (typeof portfolioItemTypes)[number];

const trimmedList = (maximumItems: number, maximumLength: number, itemMessage: string, listMessage: string) =>
  z.array(z.string().trim().max(maximumLength, itemMessage), { error: "يجب إرسال القائمة بصيغة صحيحة." })
    .max(maximumItems, listMessage)
    .transform((items) => items.filter(Boolean));

export const portfolioEducationIdentitySchema = z.object({
  vision: z.string().trim().max(1000, "يجب ألا تتجاوز الرؤية 1000 حرف."),
  mission: z.string().trim().max(1200, "يجب ألا تتجاوز الرسالة 1200 حرف."),
  pillars: trimmedList(10, 120, "يجب ألا يتجاوز كل محور 120 حرفًا.", "يمكن إضافة 10 محاور كحد أقصى."),
  values: trimmedList(12, 100, "يجب ألا تتجاوز كل قيمة 100 حرف.", "يمكن إضافة 12 قيمة كحد أقصى."),
  strategicObjectives: trimmedList(20, 220, "يجب ألا يتجاوز كل هدف 220 حرفًا.", "يمكن إضافة 20 هدفًا استراتيجيًا كحد أقصى."),
});

export const portfolioSettingsSchema = z.object({
  operation: z.literal("settings"),
  title: z.string().trim().min(3, "عنوان الملف قصير جدًا.").max(160),
  academicYear: z.string().trim().min(4, "العام الدراسي مطلوب.").max(30),
  term: z.string().trim().min(2, "الفصل الدراسي مطلوب.").max(80),
  description: z.string().trim().max(500).default(""),
  themeId: z.enum(PORTFOLIO_THEME_IDS),
  preferences: z.object({
    showSchoolName: z.boolean(),
    showPrincipalName: z.boolean(),
    showCoverStatistics: z.boolean(),
    showTableOfContents: z.boolean(),
    showPerformanceDividers: z.boolean(),
  }),
});

export const portfolioContentSchema = z.object({
  operation: z.literal("content"),
  introText: z.string().trim().max(5000),
  conclusionText: z.string().trim().max(5000),
  biography: z.object({
    professionalSummary: z.string().trim().max(3000),
    specialization: z.string().trim().max(200),
    academicQualification: z.string().trim().max(300),
    yearsOfExperience: z.string().trim().max(80),
    skills: z.string().trim().max(1000),
    professionalInterests: z.string().trim().max(1000),
  }),
  educationIdentity: portfolioEducationIdentitySchema,
});

export const portfolioPatchSchema = z.discriminatedUnion("operation", [
  portfolioSettingsSchema,
  portfolioContentSchema,
]);

const portfolioAttachmentUrlSchema = z.union([
  z.literal(""),
  z.string().regex(/^\/uploads\/[A-Za-z0-9][A-Za-z0-9/_-]*\.(?:jpe?g|png|webp)$/i, "مسار الصورة المرفقة غير صالح."),
  z.url("رابط المرفق غير صحيح.").refine((value) => value.startsWith("https://"), "يجب أن يبدأ الرابط الخارجي بـ https://"),
]);

export const portfolioItemCreateSchema = z.object({
  type: z.enum(portfolioItemTypes),
  title: z.string().trim().min(2, "عنوان العنصر مطلوب.").max(200),
  issuer: z.string().trim().max(200).default(""),
  date: z.string().trim().max(40).default(""),
  hours: z.string().trim().max(40).default(""),
  description: z.string().trim().max(2000).default(""),
  attachmentUrl: portfolioAttachmentUrlSchema.default(""),
  attachmentMimeType: z.enum(["image/jpeg", "image/png", "image/webp", ""]).default(""),
  attachmentKind: z.enum(["IMAGE", ""]).default(""),
  isVisible: z.boolean().default(true),
});

export const portfolioItemPatchSchema = z.union([
  portfolioItemCreateSchema.partial().extend({ action: z.literal("update") }),
  z.object({ action: z.literal("move"), direction: z.enum(["up", "down"]) }),
]);

export const portfolioSectionPatchSchema = z.object({ isEnabled: z.boolean() });
export const portfolioMoveSchema = z.object({ direction: z.enum(["up", "down"]) });

export const portfolioReportVisibilitySchema = z.object({ isVisible: z.boolean() });
export const portfolioEvidencePatchSchema = z.object({
  isVisible: z.boolean().optional(),
  customTitle: z.string().trim().max(200).optional(),
  customDescription: z.string().trim().max(1000).optional(),
}).refine((value) => Object.keys(value).length > 0, "لا توجد تغييرات للحفظ.");

export const customEvidenceCreateSchema = z.object({
  title: z.string().trim().min(2, "عنوان الشاهد مطلوب.").max(200),
  description: z.string().trim().max(2000).default(""),
  fileUrl: z.union([z.url("رابط الشاهد غير صحيح."), z.string().startsWith("/uploads/"), z.literal("")]),
  mimeType: z.string().trim().max(120).default(""),
  sectionId: z.string().trim().min(1).nullable().optional(),
  isVisible: z.boolean().default(true),
});
export const customEvidencePatchSchema = customEvidenceCreateSchema.partial();

export type PortfolioPreferences = z.infer<typeof portfolioSettingsSchema>["preferences"];
export type PortfolioBiography = z.infer<typeof portfolioContentSchema>["biography"];
export type PortfolioEducationIdentity = z.infer<typeof portfolioEducationIdentitySchema>;

export type PortfolioWorkspaceItem = {
  id: string;
  type: PortfolioItemType;
  title: string;
  issuer: string;
  date: string;
  hours: string;
  description: string;
  attachmentUrl: string;
  attachmentMimeType: "image/jpeg" | "image/png" | "image/webp" | "";
  attachmentKind: "IMAGE" | "";
  sortOrder: number;
  isVisible: boolean;
};

export type PortfolioReportSourceType = "GUIDANCE_REPORT" | "REPORT_SNAPSHOT";
export type PortfolioEvidencePreference = {
  isVisible: boolean;
  sortOrder: number;
  customTitle: string;
  customDescription: string;
};
export type PortfolioManagedEvidence = {
  id: string;
  originalTitle: string;
  title: string;
  description: string;
  url: string | null;
  type: string;
  isVisible: boolean;
  sortOrder: number;
};
export type PortfolioManagedReport = {
  itemId: string;
  sourceId: string;
  sourceType: PortfolioReportSourceType;
  sectionId: string;
  sectionKey: string;
  title: string;
  serviceName: string;
  caseTitle: string | null;
  status: string;
  generatedAt: string | null;
  createdAt: string;
  previewUrl: string;
  isVisible: boolean;
  sortOrder: number;
  isPersisted: boolean;
  isAvailable: boolean;
  evidence: PortfolioManagedEvidence[];
};
export type PortfolioReportGroup = {
  sectionId: string;
  sectionKey: string;
  title: string;
  weight: number;
  isEnabled: boolean;
  availableCount: number;
  includedCount: number;
  visibleEvidenceCount: number;
  linkedOutputs: PortfolioServiceOutput[];
  linkedOutputCount: number;
  reports: PortfolioManagedReport[];
};
export type PortfolioCustomEvidence = {
  id: string;
  sectionId: string | null;
  title: string;
  description: string;
  fileUrl: string;
  mimeType: string;
  sortOrder: number;
  isVisible: boolean;
};
