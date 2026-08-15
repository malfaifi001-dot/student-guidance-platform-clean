import {
  z,
} from "zod";

export const aiStageSchema =
  z.enum([
    "ELEMENTARY",
    "MIDDLE",
    "HIGH",
  ]);

export const aiSourceSchema =
  z.enum([
    "USER",
    "AI_PROPOSAL",
  ]);

export const confidenceSchema =
  z.number()
    .min(0)
    .max(1);

export const planningSchema =
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
        z.string()
          .trim()
          .min(1),
      )
        .default([]),

    alternatives:
      z.array(
        z.string()
          .trim()
          .min(1),
      )
        .default([]),

    stages:
      z.array(
        aiStageSchema,
      )
        .default([]),

    classes:
      z.array(
        z.object({
          name:
            z.string()
              .trim()
              .min(1),

          stage:
            aiStageSchema,

          grade:
            z.string()
              .trim()
              .nullable()
              .default(null),

          source:
            aiSourceSchema,

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
            z.array(
              aiStageSchema,
            )
              .default([]),

          weeklyLessons:
            z.number()
              .int()
              .positive()
              .nullable()
              .default(null),

          source:
            aiSourceSchema,

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
  });

export const teachersSchema =
  z.object({
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
              .max(60)
              .nullable()
              .default(null),

          source:
            aiSourceSchema,

          confidence:
            confidenceSchema,
        }),
      )
        .default([]),

    assumptions:
      z.array(
        z.string()
          .trim()
          .min(1),
      )
        .default([]),

    warnings:
      z.array(
        z.string()
          .trim()
          .min(1),
      )
        .default([]),
  });

export const assignmentsSchema =
  z.object({
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
            aiSourceSchema,

          confidence:
            confidenceSchema,
        }),
      )
        .default([]),

    assumptions:
      z.array(
        z.string()
          .trim()
          .min(1),
      )
        .default([]),

    warnings:
      z.array(
        z.string()
          .trim()
          .min(1),
      )
        .default([]),
  });

export const constraintsSchema =
  z.object({
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
            aiSourceSchema,

          confidence:
            confidenceSchema,
        }),
      )
        .default([]),

    assumptions:
      z.array(
        z.string()
          .trim()
          .min(1),
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