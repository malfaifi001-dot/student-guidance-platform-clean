import {
  z,
} from "zod";

const confidenceSchema =
  z.number()
    .min(0)
    .max(1);

const stageSchema =
  z.enum([
    "ELEMENTARY",
    "MIDDLE",
    "HIGH",
  ]);

const sourceSchema =
  z.enum([
    "USER",
    "AI_PROPOSAL",
  ]);

export const timetableAiImportSchema =
  z.object({
    mode:
      z.enum([
        "EXTRACT",
        "PROPOSE",
      ]),

    summary:
      z.string()
        .trim()
        .default(""),

    assumptions:
      z.array(
        z.string().trim().min(1),
      )
        .default([]),

    alternatives:
      z.array(
        z.string().trim().min(1),
      )
        .default([]),

    stages:
      z.array(stageSchema)
        .default([]),

    classes:
      z.array(
        z.object({
          name:
            z.string()
              .trim()
              .min(1),

          stage:
            stageSchema
              .nullable()
              .default(null),

          grade:
            z.string()
              .trim()
              .nullable()
              .default(null),

          source:
            sourceSchema,

          confidence:
            confidenceSchema,
        }),
      )
        .default([]),

    subjects:
      z.array(
        z.object({
          name:
            z.string()
              .trim()
              .min(1),

          stageIds:
            z.array(stageSchema)
              .default([]),

          weeklyLessons:
            z.number()
              .int()
              .positive()
              .nullable()
              .default(null),

          source:
            sourceSchema,

          confidence:
            confidenceSchema,
        }),
      )
        .default([]),

    teachers:
      z.array(
        z.object({
          name:
            z.string()
              .trim()
              .min(1),

          specialty:
            z.string()
              .trim()
              .nullable()
              .default(null),

          maxWeeklyLoad:
            z.number()
              .int()
              .positive()
              .nullable()
              .default(null),

          source:
            sourceSchema,

          confidence:
            confidenceSchema,
        }),
      )
        .default([]),

    assignments:
      z.array(
        z.object({
          teacherName:
            z.string()
              .trim()
              .min(1),

          subjectName:
            z.string()
              .trim()
              .min(1),

          className:
            z.string()
              .trim()
              .min(1),

          weeklyLessons:
            z.number()
              .int()
              .positive()
              .nullable()
              .default(null),

          source:
            sourceSchema,

          confidence:
            confidenceSchema,
        }),
      )
        .default([]),

    constraintCandidates:
      z.array(
        z.object({
          text:
            z.string()
              .trim()
              .min(1),

          teacherName:
            z.string()
              .trim()
              .nullable()
              .default(null),

          subjectName:
            z.string()
              .trim()
              .nullable()
              .default(null),

          className:
            z.string()
              .trim()
              .nullable()
              .default(null),

          suggestedType:
            z.string()
              .trim()
              .nullable()
              .default(null),

          source:
            sourceSchema,

          confidence:
            confidenceSchema,
        }),
      )
        .default([]),

    warnings:
      z.array(
        z.string()
          .trim()
          .min(1),
      )
        .default([]),

    uncertainFields:
      z.array(
        z.object({
          entity:
            z.string()
              .trim()
              .min(1),

          field:
            z.string()
              .trim()
              .min(1),

          value:
            z.string()
              .trim()
              .nullable()
              .default(null),

          reason:
            z.string()
              .trim()
              .min(1),
        }),
      )
        .default([]),
  });

export type TimetableAiImportParsed =
  z.infer<
    typeof timetableAiImportSchema
  >;
