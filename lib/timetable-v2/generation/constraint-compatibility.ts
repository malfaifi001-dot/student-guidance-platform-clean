import {
  CONSTRAINT_CATALOG,
} from "../constraint-catalog";

import {
  isSupportedGenerationConstraint,
  normalizeGenerationConstraintType,
} from "./constraint-type-normalizer";

export type GenerationCatalogCompatibilityIssue = {
  type: string;
  canonicalType: string;
  strength: "HARD" | "SOFT";
};

export function getGenerationCatalogCompatibilityIssues():
  GenerationCatalogCompatibilityIssue[] {
  const issues:
    GenerationCatalogCompatibilityIssue[] =
      [];

  for (
    const definition of
    CONSTRAINT_CATALOG
  ) {
    for (
      const strength of
      definition.allowedStrengths
    ) {
      if (
        isSupportedGenerationConstraint(
          definition.type,
          strength,
        )
      ) {
        continue;
      }

      issues.push({
        type:
          definition.type,

        canonicalType:
          normalizeGenerationConstraintType(
            definition.type,
          ),

        strength,
      });
    }
  }

  return issues;
}

export function assertGenerationCatalogCompatibility() {
  const issues =
    getGenerationCatalogCompatibilityIssues();

  if (
    issues.length === 0
  ) {
    return;
  }

  const details =
    issues
      .map(
        (issue) =>
          `${issue.type} -> ${issue.canonicalType} (${issue.strength})`,
      )
      .join(", ");

  throw new Error(
    `TIMETABLE_V2_CONSTRAINT_CONTRACT_MISMATCH: ${details}`,
  );
}