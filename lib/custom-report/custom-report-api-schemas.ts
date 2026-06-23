import { z } from "zod";

const optionalPromptSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.union([z.string().max(4000), z.null(), z.undefined()]),
).transform((value) => {
  if (typeof value !== "string") {
    return null;
  }

  return value.length ? value : null;
});

export const createCustomReportTemplateSchema = z.object({
  schema: z.unknown(),
  prompt: optionalPromptSchema,
  source: z.enum(["AI", "FALLBACK"]).optional(),
});

export const updateCustomReportTemplateSchema = z.object({
  schema: z.unknown(),
});
