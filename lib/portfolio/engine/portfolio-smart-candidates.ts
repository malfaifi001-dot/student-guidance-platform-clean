import type {
  PortfolioPhysicalDocument,
  PortfolioPhysicalPage,
} from "@/lib/portfolio/layout/portfolio-physical-types";

import type {
  PortfolioReportPageModel,
} from "@/components/portfolio/print/portfolio-print-types";

import {
  getPortfolioFieldBandPlan,
} from "@/lib/portfolio/layout/portfolio-field-layout";
import { getPortfolioSourceEvidenceItems } from "@/lib/portfolio/engine/portfolio-smart-evidence";

export type PortfolioSmartDensity =
  | "normal"
  | "compact"
  | "dense"
  | "minimum-safe";

export type PortfolioFieldLayoutMode =
  | "balanced-grid"
  | "dense-grid";

export type PortfolioSmartCandidate = {
  id: string;

  density: PortfolioSmartDensity;

  fieldLayout:
    PortfolioFieldLayoutMode;

  columnCount:
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6;

  evidenceCount:
    | 0
    | 1
    | 2;

  evidenceLayout:
    | "evidence-2-column"
    | "evidence-1-column";

  readabilityScore: number;
};

/**
 * Candidate order does NOT mean winner order.
 *
 * Batch 3 will measure them page-by-page.
 */
export const PORTFOLIO_SMART_CANDIDATES:
  readonly PortfolioSmartCandidate[] = [
  {
    id: "normal-4-e2",
    density: "normal",
    fieldLayout: "balanced-grid",
    columnCount: 4,
    evidenceCount: 2,
    evidenceLayout: "evidence-2-column",
    readabilityScore: 100,
  },
  {
    id: "normal-4-e1",
    density: "normal",
    fieldLayout: "balanced-grid",
    columnCount: 4,
    evidenceCount: 1,
    evidenceLayout: "evidence-1-column",
    readabilityScore: 99,
  },
  {
    id: "normal-4-e0",
    density: "normal",
    fieldLayout: "balanced-grid",
    columnCount: 4,
    evidenceCount: 0,
    evidenceLayout: "evidence-2-column",
    readabilityScore: 98,
  },

  {
    id: "normal-5-e2",
    density: "normal",
    fieldLayout: "dense-grid",
    columnCount: 5,
    evidenceCount: 2,
    evidenceLayout: "evidence-2-column",
    readabilityScore: 97,
  },
  {
    id: "normal-5-e1",
    density: "normal",
    fieldLayout: "dense-grid",
    columnCount: 5,
    evidenceCount: 1,
    evidenceLayout: "evidence-1-column",
    readabilityScore: 96,
  },
  {
    id: "normal-5-e0",
    density: "normal",
    fieldLayout: "dense-grid",
    columnCount: 5,
    evidenceCount: 0,
    evidenceLayout: "evidence-2-column",
    readabilityScore: 95,
  },

  {
    id: "compact-6-e2",
    density: "compact",
    fieldLayout: "dense-grid",
    columnCount: 6,
    evidenceCount: 2,
    evidenceLayout: "evidence-2-column",
    readabilityScore: 92,
  },
  {
    id: "compact-6-e1",
    density: "compact",
    fieldLayout: "dense-grid",
    columnCount: 6,
    evidenceCount: 1,
    evidenceLayout: "evidence-1-column",
    readabilityScore: 91,
  },
  {
    id: "compact-6-e0",
    density: "compact",
    fieldLayout: "dense-grid",
    columnCount: 6,
    evidenceCount: 0,
    evidenceLayout: "evidence-2-column",
    readabilityScore: 90,
  },

  {
    id: "compact-4-e1",
    density: "compact",
    fieldLayout: "dense-grid",
    columnCount: 4,
    evidenceCount: 1,
    evidenceLayout: "evidence-1-column",
    readabilityScore: 86,
  },
  {
    id: "compact-4-e0",
    density: "compact",
    fieldLayout: "dense-grid",
    columnCount: 4,
    evidenceCount: 0,
    evidenceLayout: "evidence-2-column",
    readabilityScore: 85,
  },

  {
    id: "dense-3-e1",
    density: "dense",
    fieldLayout: "dense-grid",
    columnCount: 3,
    evidenceCount: 1,
    evidenceLayout: "evidence-1-column",
    readabilityScore: 72,
  },
  {
    id: "dense-3-e0",
    density: "dense",
    fieldLayout: "dense-grid",
    columnCount: 3,
    evidenceCount: 0,
    evidenceLayout: "evidence-2-column",
    readabilityScore: 71,
  },

  {
    id: "minimum-safe-2-e0",
    density: "minimum-safe",
    fieldLayout: "dense-grid",
    columnCount: 2,
    evidenceCount: 0,
    evidenceLayout: "evidence-2-column",
    readabilityScore: 58,
  },

  {
    id: "minimum-safe-1-e0",
    density: "minimum-safe",
    fieldLayout: "dense-grid",
    columnCount: 1,
    evidenceCount: 0,
    evidenceLayout: "evidence-1-column",
    readabilityScore: 45,
  },
];

/**
 * Temporary compatibility shape used by the current hidden runtime.
 *
 * Batch 3 replaces this global result with page-scoped measurements.
 */
export type PortfolioSmartMeasurementResult = {
  candidateId: string;

  fits: boolean;

  overflowPx: number;

  blockOverflowPx: number;

  scrollOverflowPx: number;

  boundingOverflowPx: number;

  mainContentOverflowPx: number;

  pageHeightPx: number;

  viewportHeightPx: number;

  headerBoundaryPx: number;

  footerBoundaryPx: number;

  contentTopPx: number;

  contentBottomPx: number;

  mainContentBottomPx: number;

  fieldHeightPx: number;

  narrativeHeightPx: number;

  evidenceHeightPx: number;

  tableHeightPx: number;

  dominantRole: string;

  severity:
    | "none"
    | "tiny"
    | "small"
    | "medium"
    | "large";

  stable: boolean;

  fieldHeights:
    Record<string, number>;
};

function getPortfolioReportPageModel(
  payload: unknown,
): PortfolioReportPageModel | undefined {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("page" in payload)
  ) {
    return undefined;
  }

  const model =
    (
      payload as {
        page?: unknown;
      }
    ).page;

  return model &&
    typeof model === "object"
    ? model as PortfolioReportPageModel
    : undefined;
}

/**
 * Compatibility adapter for the OLD global-candidate runtime.
 *
 * Batch 3 replaces this function with page-scoped frozen decisions.
 *
 * Do not add new business logic here.
 */
export function applyPortfolioSmartCandidate(
  document: PortfolioPhysicalDocument,
  candidate: PortfolioSmartCandidate,
  frozen = false,
  fieldHeights?: Record<string, number>,
): PortfolioPhysicalDocument {
  let pages:
    PortfolioPhysicalPage[] =
    document.pages.map((page) => {
      const model =
        getPortfolioReportPageModel(
          page.payload,
        );

      const details =
        model?.sections.find(
          (
            section,
          ): section is Extract<
            PortfolioReportPageModel["sections"][number],
            {
              kind: "details";
            }
          > =>
            section.kind === "details",
        );

      const fieldBands =
        details
          ? getPortfolioFieldBandPlan(
              details.fields,
              candidate.columnCount,
              fieldHeights,
            )
          : undefined;

      const rawPayload =
        page.payload &&
        typeof page.payload === "object"
          ? page.payload as Record<
              string,
              unknown
            >
          : {};

      return {
        ...page,

        density:
          candidate.density,

        candidateId:
          candidate.id,

        fieldLayout:
          candidate.fieldLayout,

        fieldColumnCount:
          candidate.columnCount,

        frozen,

        fieldBands,

        evidenceLayout:
          candidate.evidenceLayout,

        payload:
          model
            ? {
                ...rawPayload,

                page: {
                  ...model,

                  fieldLayout:
                    candidate.fieldLayout,

                  fieldColumnCount:
                    candidate.columnCount,

                  fieldBands,
                },
              }
            : page.payload,
      };
    });

  const candidatePageById =
    new Map(
      pages.map(
        (page) => [
          page.id,
          page,
        ],
      ),
    );

  const reportPages:
    Record<
      string,
      PortfolioPhysicalPage[]
    > = {};

  for (
    const [
      reportId,
      sourcePages,
    ] of Object.entries(
      document.reportPages,
    )
  ) {
    const candidateSourcePages =
      sourcePages.map(
        (sourcePage) =>
          candidatePageById.get(
            sourcePage.id,
          ) ?? sourcePage,
      );

    const primary =
      candidateSourcePages[0];

    if (!primary) {
      continue;
    }

    const allEvidence =
      getPortfolioSourceEvidenceItems(candidateSourcePages);

    const count =
      Math.min(
        candidate.evidenceCount,
        allEvidence.length,
      ) as 0 | 1 | 2;

    const currentModel =
      getPortfolioReportPageModel(
        primary.payload,
      );

    const regularSections =
      (
        currentModel?.sections ?? []
      ).filter(
        (section) =>
          section.kind !== "evidence",
      );

    const primaryPayload =
      primary.payload &&
      typeof primary.payload ===
        "object"
        ? primary.payload as Record<
            string,
            unknown
          >
        : {};

    const rebuilt:
      PortfolioPhysicalPage[] = [
      {
        ...primary,

        evidenceLayout:
          candidate.evidenceLayout,

        primaryEvidenceCount:
          count,

        overflowEvidenceCount:
          Math.max(
            0,
            allEvidence.length - count,
          ),

        payload:
          currentModel
            ? {
                ...primaryPayload,

                page: {
                  ...currentModel,

                  sections: [
                    ...regularSections,

                    ...(count
                      ? [
                          {
                            kind:
                              "evidence" as const,

                            items:
                              allEvidence.slice(
                                0,
                                count,
                              ),
                          },
                        ]
                      : []),
                  ],
                },
              }
            : primary.payload,
      },
    ];

    const template =
      candidateSourcePages[1] ??
      primary;

    for (
      let index = count;
      index < allEvidence.length;
      index += 2
    ) {
      const items =
        allEvidence.slice(
          index,
          index + 2,
        );

      const templateModel =
        getPortfolioReportPageModel(
          template.payload,
        );

      const templatePayload =
        template.payload &&
        typeof template.payload ===
          "object"
          ? template.payload as Record<
              string,
              unknown
            >
          : {};

      rebuilt.push({
        ...template,

        id:
          `${primary.id}-evidence-${Math.floor(index / 2) + 1}`,

        continuationIndex:
          rebuilt.length,

        fieldBands:
          undefined,

        fieldColumnCount:
          undefined,

        fieldLayout:
          undefined,

        primaryEvidenceCount:
          0,

        overflowEvidenceCount:
          Math.max(
            0,
            allEvidence.length -
              index -
              items.length,
          ),

        evidenceLayout:
          items.length === 1
            ? "evidence-1-column"
            : "evidence-2-column",

        payload:
          templateModel
            ? {
                ...templatePayload,

                page: {
                  ...templateModel,

                  fieldBands:
                    undefined,

                  fieldColumnCount:
                    undefined,

                  fieldLayout:
                    undefined,

                  key:
                    `${primary.id}-evidence-${Math.floor(index / 2) + 1}`,

                  sections: [
                    {
                      kind:
                        "evidence" as const,

                      items,
                    },
                  ],
                },
              }
            : template.payload,
      });
    }

    reportPages[
      reportId
    ] = rebuilt;

    const sourceIds =
      new Set(
        sourcePages.map(
          (page) => page.id,
        ),
      );

    pages = [
      ...pages.filter(
        (page) =>
          !sourceIds.has(page.id),
      ),

      ...rebuilt,
    ];
  }

  const pageById =
    new Map(
      pages.map(
        (page) => [
          page.id,
          page,
        ],
      ),
    );

  return {
    ...document,

    pages,

    serviceOutputPages:
      Object.fromEntries(
        Object.entries(
          document.serviceOutputPages,
        ).map(
          ([key, items]) => [
            key,

            items.map(
              (page) =>
                pageById.get(
                  page.id,
                ) ?? page,
            ),
          ],
        ),
      ),

    reportPages,

    evidencePages:
      Object.fromEntries(
        Object.entries(
          reportPages,
        ).map(
          ([key, items]) => [
            key,

            items.filter(
              (page) => {
                const model =
                  getPortfolioReportPageModel(
                    page.payload,
                  );

                return (
                  page.primaryEvidenceCount ===
                    0 &&
                  Boolean(
                    model?.sections.some(
                      (section) =>
                        section.kind ===
                        "evidence",
                    ),
                  )
                );
              },
            ),
          ],
        ),
      ),
  };
}
