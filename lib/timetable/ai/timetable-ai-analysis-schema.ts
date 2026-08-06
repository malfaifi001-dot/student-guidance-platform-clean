import { z } from "zod";

const roundedPercentageSchema = z
  .number()
  .finite()
  .min(0)
  .max(100)
  .transform((value) => Math.round(value));

const roundedPrioritySchema = z
  .number()
  .finite()
  .min(1)
  .max(100)
  .transform((value) => Math.round(value));

export const timetableAiAnalysisModeSchema =
  z.enum([
    "FULL_REVIEW",
    "PRE_GENERATION",
    "GENERATION_FAILURE",
    "WORKLOAD_REVIEW",
  ]);

export const timetableAiSeveritySchema =
  z.enum([
    "CRITICAL",
    "HIGH",
    "MEDIUM",
    "LOW",
    "INFO",
  ]);

export const timetableAiFindingCategorySchema =
  z.enum([
    "DATA",
    "WORKLOAD",
    "CONSTRAINT",
    "GENERATION",
    "CLASS_CAPACITY",
    "ASSIGNMENT",
    "AVAILABILITY",
    "DOUBLE_PERIOD",
    "FIXED_SLOT",
    "DISTRIBUTION",
    "OTHER",
  ]);

export const timetableAiFindingSchema =
  z.object({
    id: z.string().trim().min(1).max(120),

    severity: timetableAiSeveritySchema,

    category:
      timetableAiFindingCategorySchema,

    title: z
      .string()
      .trim()
      .min(1)
      .max(240),

    explanation: z
      .string()
      .trim()
      .min(1)
      .max(1800),

    evidence: z
      .array(
        z.string().trim().min(1).max(600),
      )
      .max(10)
      .default([]),

    affectedEntities: z
      .array(
        z.object({
          type: z
            .string()
            .trim()
            .min(1)
            .max(60),

          name: z
            .string()
            .trim()
            .min(1)
            .max(240),
        }),
      )
      .max(15)
      .default([]),

    relatedConstraintIds: z
      .array(
        z.string().trim().min(1).max(120),
      )
      .max(20)
      .default([]),

    relatedConstraints: z
      .array(
        z.object({
          reference: z.string().trim().min(1).max(120),
          title: z.string().trim().min(1).max(240),
        }),
      )
      .max(20)
      .default([]),

    confidence: roundedPercentageSchema,
  });

export const timetableAiRecommendationSchema =
  z.object({
    id: z.string().trim().min(1).max(120),

    priority: roundedPrioritySchema,

    title: z
      .string()
      .trim()
      .min(1)
      .max(240),

    action: z
      .string()
      .trim()
      .min(1)
      .max(1800),

    expectedImpact: z
      .string()
      .trim()
      .min(1)
      .max(900),

    risk: z.enum([
      "LOW",
      "MEDIUM",
      "HIGH",
    ]),

    changeType: z.enum([
      "NO_CHANGE",
      "DATA_FIX",
      "CONSTRAINT_TO_PREFERRED",
      "CONSTRAINT_DISABLE",
      "CONSTRAINT_VALUE_CHANGE",
      "ASSIGNMENT_CHANGE",
      "AVAILABILITY_CHANGE",
      "DOUBLE_PERIOD_CHANGE",
      "RETRY_GENERATION",
      "OTHER",
    ]),

    requiresApproval: z
      .boolean()
      .default(true),

    relatedFindingIds: z
      .array(
        z.string().trim().min(1).max(120),
      )
      .max(20)
      .default([]),
  });

export const timetableAiAnalysisSchema =
  z.object({
    summary: z
      .string()
      .trim()
      .min(1)
      .max(2200),

    likelyRootCause: z
      .string()
      .trim()
      .min(1)
      .max(1200),

    healthScore: roundedPercentageSchema,

    readiness: z.enum([
      "READY",
      "READY_WITH_WARNINGS",
      "NOT_READY",
      "UNKNOWN",
    ]),

    failureKind: z.enum([
      "NONE",
      "VALIDATION_ERROR",
      "PROVEN_CONFLICT",
      "LIKELY_CONSTRAINT_CONFLICT",
      "SEARCH_TIMEOUT",
      "CAPACITY_PROBLEM",
      "ASSIGNMENT_PROBLEM",
      "UNKNOWN",
    ]),

    findings: z
      .array(timetableAiFindingSchema)
      .max(24)
      .default([]),

    recommendations: z
      .array(
        timetableAiRecommendationSchema,
      )
      .max(20)
      .default([]),

    safeNextStep: z
      .string()
      .trim()
      .min(1)
      .max(1200),

    assumptions: z
      .array(
        z.string().trim().min(1).max(500),
      )
      .max(10)
      .default([]),

    disclaimer: z
      .string()
      .trim()
      .min(1)
      .max(600),
  });

export const timetableAiAnalysisRequestSchema =
  z.object({
    mode:
      timetableAiAnalysisModeSchema.default(
        "FULL_REVIEW",
      ),

    generationErrors: z
      .array(
        z.string().trim().min(1).max(1200),
      )
      .max(20)
      .default([]),

    question: z
      .string()
      .trim()
      .max(1200)
      .optional(),
  });

export type TimetableAiAnalysisMode =
  z.infer<
    typeof timetableAiAnalysisModeSchema
  >;

export type TimetableAiAnalysis =
  z.infer<
    typeof timetableAiAnalysisSchema
  >;

export type TimetableAiAnalysisRequest =
  z.infer<
    typeof timetableAiAnalysisRequestSchema
  >;
