import type {
  PortfolioFrozenPageDecision,
  PortfolioPageMeasurement,
} from "@/lib/portfolio/engine/portfolio-smart-measure-types";

import {
  PORTFOLIO_SMART_CANDIDATES,
  type PortfolioSmartCandidate,
} from "@/lib/portfolio/engine/portfolio-smart-candidates";

import {
  getPortfolioFieldBandPlan,
} from "@/lib/portfolio/layout/portfolio-field-layout";

import type {
  PortfolioPhysicalDocument,
  PortfolioPhysicalPage,
} from "@/lib/portfolio/layout/portfolio-physical-types";

import type {
  PortfolioReportPageModel,
} from "@/components/portfolio/print/portfolio-print-types";


export type PortfolioPageMeasurementMap =
  Record<
    string,
    PortfolioPageMeasurement
  >;

export type PortfolioFrozenDecisionMap =
  Record<
    string,
    PortfolioFrozenPageDecision
  >;


export function getPortfolioPageMeasurementKey(
  pageId: string,
  candidateId: string,
) {
  return `${pageId}::${candidateId}`;
}


function getCandidateScore(
  candidate: PortfolioSmartCandidate,
  measurement: PortfolioPageMeasurement,
) {
  const fieldCost =
    measurement.fieldHeightPx;

  const bottomCost =
    measurement.mainContentBottomPx;

  /**
   * Readability stays important, but a materially better measured
   * 5/6-column layout is allowed to win.
   */
  return (
    candidate.readabilityScore * 18 -
    fieldCost * 1.2 -
    bottomCost * 0.06
  );
}


export function selectPortfolioCandidateForPage(
  pageId: string,
  candidates:
    readonly PortfolioSmartCandidate[],
  measurements:
    PortfolioPageMeasurementMap,
): PortfolioSmartCandidate | null {
  const measured =
    candidates
      .map((candidate) => {
        const measurement =
          measurements[
            getPortfolioPageMeasurementKey(
              pageId,
              candidate.id,
            )
          ];

        return measurement
          ? {
              candidate,
              measurement,
            }
          : null;
      })
      .filter(
        (
          item,
        ): item is {
          candidate:
            PortfolioSmartCandidate;

          measurement:
            PortfolioPageMeasurement;
        } =>
          Boolean(item),
      );

  if (
    measured.length <
    candidates.length
  ) {
    return null;
  }

  const fitting =
    measured.filter(
      ({ measurement }) =>
        measurement.fits,
    );

  if (!fitting.length) {
    return [...measured]
      .sort(
        (
          first,
          second,
        ) => {
          const overflowDifference =
            first.measurement.overflowPx -
            second.measurement.overflowPx;

          if (
            Math.abs(
              overflowDifference,
            ) > 0.5
          ) {
            return overflowDifference;
          }

          return (
            second.candidate.readabilityScore -
            first.candidate.readabilityScore
          );
        },
      )[0]
      ?.candidate ?? null;
  }

  return fitting.reduce(
    (
      best,
      current,
    ) => {
      const currentScore =
        getCandidateScore(
          current.candidate,
          current.measurement,
        );

      const bestScore =
        getCandidateScore(
          best.candidate,
          best.measurement,
        );

      return currentScore >
        bestScore
        ? current
        : best;
    },
    fitting[0],
  ).candidate;
}


export function freezePortfolioPageDecision(
  pageId: string,
  candidate: PortfolioSmartCandidate,
): PortfolioFrozenPageDecision {
  return {
    pageId,

    candidateId:
      candidate.id,

    density:
      candidate.density,

    fieldLayout:
      candidate.fieldLayout,

    columnCount:
      candidate.columnCount,

    evidenceCount:
      candidate.evidenceCount,

    evidenceLayout:
      candidate.evidenceLayout,

    frozen: true,
  };
}


function getReportPageModel(
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


function getCandidateByDecision(
  decision:
    PortfolioFrozenPageDecision,
) {
  return (
    PORTFOLIO_SMART_CANDIDATES.find(
      (candidate) =>
        candidate.id ===
        decision.candidateId,
    ) ?? null
  );
}


function getMeasuredFieldHeights(
  pageId: string,
  fields:
    Extract<
      PortfolioReportPageModel["sections"][number],
      {
        kind: "details";
      }
    >["fields"],
  measurement:
    PortfolioPageMeasurement | undefined,
) {
  if (!measurement) {
    return undefined;
  }

  const result:
    Record<string, number> = {};

  fields.forEach(
    (field, index) => {
      const instanceKey =
        `${pageId}::${field.key}::${index}`;

      const height =
        measurement.fieldHeights[
          instanceKey
        ];

      if (
        typeof height ===
          "number" &&
        height > 0
      ) {
        result[field.key] =
          height;
      }
    },
  );

  return Object.keys(result).length
    ? result
    : undefined;
}


/**
 * Applies independently measured/frozen decisions back to each REPORT.
 *
 * Other Portfolio physical pages remain untouched.
 */
export function applyPortfolioPageDecisions(
  document: PortfolioPhysicalDocument,
  decisions: PortfolioFrozenDecisionMap,
  measurements: PortfolioPageMeasurementMap,
): PortfolioPhysicalDocument {
  const rebuiltReportPages:
    Record<
      string,
      PortfolioPhysicalPage[]
    > = {};

  const sourcePageToReport =
    new Map<string, string>();

  for (
    const [
      reportId,
      sourcePages,
    ] of Object.entries(
      document.reportPages,
    )
  ) {
    for (
      const page of sourcePages
    ) {
      sourcePageToReport.set(
        page.id,
        reportId,
      );
    }

    const primary =
      sourcePages[0];

    if (!primary) {
      rebuiltReportPages[
        reportId
      ] = [];

      continue;
    }

    const decision =
      decisions[primary.id];

    if (!decision) {
      rebuiltReportPages[
        reportId
      ] = sourcePages;

      continue;
    }

    const candidate =
      getCandidateByDecision(
        decision,
      );

    if (!candidate) {
      rebuiltReportPages[
        reportId
      ] = sourcePages;

      continue;
    }

    const primaryModel =
      getReportPageModel(
        primary.payload,
      );

    if (!primaryModel) {
      rebuiltReportPages[
        reportId
      ] = sourcePages;

      continue;
    }

    const details =
      primaryModel.sections.find(
        (
          section,
        ): section is Extract<
          PortfolioReportPageModel["sections"][number],
          {
            kind: "details";
          }
        > =>
          section.kind ===
          "details",
      );

    const measurement =
      measurements[
        getPortfolioPageMeasurementKey(
          primary.id,
          candidate.id,
        )
      ];

    const measuredHeights =
      details
        ? getMeasuredFieldHeights(
            primary.id,
            details.fields,
            measurement,
          )
        : undefined;

    const fieldBands =
      details
        ? getPortfolioFieldBandPlan(
            details.fields,
            candidate.columnCount,
            measuredHeights,
          )
        : undefined;

    const allEvidence =
      sourcePages.flatMap(
        (sourcePage) => {
          const model =
            getReportPageModel(
              sourcePage.payload,
            );

          return (
            model?.sections.flatMap(
              (section) =>
                section.kind ===
                "evidence"
                  ? section.items
                  : [],
            ) ?? []
          );
        },
      );

    const primaryEvidenceCount =
      Math.min(
        candidate.evidenceCount,
        allEvidence.length,
      ) as 0 | 1 | 2;

    const regularSections =
      primaryModel.sections.filter(
        (section) =>
          section.kind !==
          "evidence",
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

    const frozenPrimary:
      PortfolioPhysicalPage = {
      ...primary,

      candidateId:
        candidate.id,

      density:
        candidate.density,

      fieldLayout:
        candidate.fieldLayout,

      fieldColumnCount:
        candidate.columnCount,

      fieldBands,

      evidenceLayout:
        candidate.evidenceLayout,

      primaryEvidenceCount,

      overflowEvidenceCount:
        Math.max(
          0,
          allEvidence.length -
            primaryEvidenceCount,
        ),

      frozen: true,

      payload: {
        ...primaryPayload,

        page: {
          ...primaryModel,

          fieldLayout:
            candidate.fieldLayout,

          fieldColumnCount:
            candidate.columnCount,

          fieldBands,

          sections: [
            ...regularSections,

            ...(primaryEvidenceCount
              ? [
                  {
                    kind:
                      "evidence" as const,

                    items:
                      allEvidence.slice(
                        0,
                        primaryEvidenceCount,
                      ),
                  },
                ]
              : []),
          ],
        },
      },
    };

    const rebuilt:
      PortfolioPhysicalPage[] = [
      frozenPrimary,
    ];

    const template =
      sourcePages[1] ??
      primary;

    for (
      let index =
        primaryEvidenceCount;
      index <
      allEvidence.length;
      index += 2
    ) {
      const items =
        allEvidence.slice(
          index,
          index + 2,
        );

      const templateModel =
        getReportPageModel(
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

      const continuationNumber =
        Math.floor(
          (
            index -
            primaryEvidenceCount
          ) / 2,
        ) + 1;

      rebuilt.push({
        ...template,

        id:
          `${primary.id}-evidence-${continuationNumber}`,

        role:
          "evidence",

        pageType:
          "report-evidence",

        continuationIndex:
          rebuilt.length,

        candidateId:
          candidate.id,

        density:
          candidate.density,

        fieldBands:
          undefined,

        fieldColumnCount:
          undefined,

        fieldLayout:
          undefined,

        frozen: true,

        evidenceLayout:
          items.length === 1
            ? "evidence-1-column"
            : "evidence-2-column",

        primaryEvidenceCount:
          0,

        overflowEvidenceCount:
          Math.max(
            0,
            allEvidence.length -
              index -
              items.length,
          ),

        payload:
          templateModel
            ? {
                ...templatePayload,

                page: {
                  ...templateModel,

                  key:
                    `${primary.id}-evidence-${continuationNumber}`,

                  fieldBands:
                    undefined,

                  fieldColumnCount:
                    undefined,

                  fieldLayout:
                    undefined,

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

    rebuiltReportPages[
      reportId
    ] = rebuilt;
  }


  /**
   * Preserve physical document order.
   *
   * When the original primary report page is encountered we inject all
   * rebuilt report pages in that exact position and skip old continuations.
   */
  const insertedReports =
    new Set<string>();

  const finalPages:
    PortfolioPhysicalPage[] = [];

  for (
    const page of document.pages
  ) {
    const reportId =
      sourcePageToReport.get(
        page.id,
      );

    if (!reportId) {
      finalPages.push(page);

      continue;
    }

    if (
      insertedReports.has(
        reportId,
      )
    ) {
      continue;
    }

    insertedReports.add(
      reportId,
    );

    finalPages.push(
      ...(
        rebuiltReportPages[
          reportId
        ] ?? []
      ),
    );
  }


  const finalPageById =
    new Map(
      finalPages.map(
        (page) => [
          page.id,
          page,
        ],
      ),
    );


  return {
    ...document,

    pages:
      finalPages,

    serviceOutputPages:
      Object.fromEntries(
        Object.entries(
          document.serviceOutputPages,
        ).map(
          ([key, pages]) => [
            key,

            pages.map(
              (page) =>
                finalPageById.get(
                  page.id,
                ) ?? page,
            ),
          ],
        ),
      ),

    reportPages:
      rebuiltReportPages,

    evidencePages:
      Object.fromEntries(
        Object.entries(
          rebuiltReportPages,
        ).map(
          ([reportId, pages]) => [
            reportId,

            pages.filter(
              (page) => {
                const model =
                  getReportPageModel(
                    page.payload,
                  );

                return Boolean(
                  model?.sections.some(
                    (section) =>
                      section.kind ===
                      "evidence",
                  ),
                ) &&
                  !model?.sections.some(
                    (section) =>
                      section.kind ===
                      "details",
                  );
              },
            ),
          ],
        ),
      ),
  };
}