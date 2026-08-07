import {
  CONSTRAINT_CATALOG,
} from "../lib/timetable-v2/constraint-catalog";

import {
  getGenerationCatalogCompatibilityIssues,
} from "../lib/timetable-v2/generation/constraint-compatibility";

const issues =
  getGenerationCatalogCompatibilityIssues();

console.log(
  `Timetable V2 constraint catalog: ${CONSTRAINT_CATALOG.length} definitions`,
);

if (
  issues.length > 0
) {
  console.error(
    "Timetable V2 constraint contract mismatch:",
  );

  for (
    const issue of
    issues
  ) {
    console.error(
      `- ${issue.type} -> ${issue.canonicalType} (${issue.strength})`,
    );
  }

  process.exit(1);
}

console.log(
  "Timetable V2 constraint contract: OK",
);