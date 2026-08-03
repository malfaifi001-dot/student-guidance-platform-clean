import { z } from "zod";

const surveyOwnerRoleSchema = z.enum([
  "ADMIN",
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "TEACHER",
]);

const surveyQuestionTypeSchema = z.enum([
  "TEXT",
  "TEXTAREA",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "YES_NO",
  "RATING",
  "SCALE",
  "NUMBER",
  "DATE",
]);

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.union([z.string().max(maxLength), z.null(), z.undefined()]),
  ).transform((value) => {
    if (typeof value !== "string") {
      return null;
    }

    return value.length ? value : null;
  });

const optionalNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return value;
}, z.number().finite().optional());

export const surveyQuestionInputSchema = z
  .object({
    label: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.string().min(1).max(300),
    ),
    type: surveyQuestionTypeSchema.default("TEXT"),
    sectionTitle: optionalTrimmedString(180),
    helpText: optionalTrimmedString(500),
    isRequired: z.boolean().optional().default(false),
    scaleMin: optionalNumber,
    scaleMax: optionalNumber,
    options: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  })
  .superRefine((value, ctx) => {
    const requiresOptions =
      value.type === "SINGLE_CHOICE" || value.type === "MULTIPLE_CHOICE";

    if (requiresOptions && value.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "الأسئلة الاختيارية تحتاج خيارًا واحدًا على الأقل.",
        path: ["options"],
      });
    }

    if (
      (value.type === "SCALE" || value.type === "NUMBER" || value.type === "RATING") &&
      value.scaleMin !== undefined &&
      value.scaleMax !== undefined &&
      value.scaleMax < value.scaleMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "الحد الأعلى يجب أن يكون أكبر من أو يساوي الحد الأدنى.",
        path: ["scaleMax"],
      });
    }
  });

export const surveyCreatePayloadSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: optionalTrimmedString(1000),
  audienceType: z.string().trim().min(1).max(50).default("GENERAL"),
  ownerRole: surveyOwnerRoleSchema.optional(),
  boardPath: z.string().trim().min(1).max(160).default("/dashboard/surveys"),
  isAnonymous: z.boolean().optional().default(false),
  opensAt: optionalTrimmedString(40),
  endsAt: optionalTrimmedString(40),
  questions: z.array(surveyQuestionInputSchema).min(1).max(50),
});

export const surveyTemplateCreatePayloadSchema = z.object({
  templateKey: z.string().trim().min(1).max(120),
  ownerRole: surveyOwnerRoleSchema.optional(),
  boardPath: optionalTrimmedString(160),
});

export const surveyActionSchema = z.enum([
  "update-draft",
  "publish",
  "close",
  "archive",
]);

export const surveyUpdateDraftPayloadSchema = surveyCreatePayloadSchema.extend({
  action: z.literal("update-draft"),
});

export const surveyStateActionPayloadSchema = z.object({
  action: z.enum(["publish", "close", "archive"]),
});

export { surveyOwnerRoleSchema };
