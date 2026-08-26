"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {
  MinistryElegantPortfolioPrint,
} from "@/components/portfolio/print/ministry-elegant-portfolio-print";

import {
  EditorialAtlasPortfolioPrint,
} from "@/components/portfolio/print/editorial-atlas-portfolio-print";

import {
  GeometricHorizonPortfolioPrint,
} from "@/components/portfolio/print/geometric-horizon-portfolio-print";

import {
  MoeOfficial2024PortfolioPrint,
} from "@/components/portfolio/print/moe-official-2024-portfolio-print";

import {
  PortfolioPageMeasurementCandidate,
} from "@/components/portfolio/print/portfolio-page-measurement-candidate";

import type {
  PortfolioPrintData,
  PortfolioReportPageModel,
} from "@/components/portfolio/print/portfolio-print-types";

import {
  DEFAULT_PORTFOLIO_THEME_ID,
  isPortfolioThemeId,
  type PortfolioThemeId,
} from "@/lib/portfolio/portfolio-theme-registry";

import {
  buildPortfolioLogicalDocument,
} from "@/lib/portfolio/layout/portfolio-logical-document";

import {
  planPortfolioPhysicalDocument,
} from "@/lib/portfolio/layout/portfolio-physical-planner";

import type {
  PortfolioPhysicalDocument,
  PortfolioPhysicalPage,
} from "@/lib/portfolio/layout/portfolio-physical-types";

import {
  PORTFOLIO_A4,
  PORTFOLIO_FONT_STACK,
  PORTFOLIO_TYPOGRAPHY,
} from "@/lib/portfolio/layout/portfolio-typography";

import {
  PORTFOLIO_SMART_CANDIDATES,
} from "@/lib/portfolio/engine/portfolio-smart-candidates";

import type {
  PortfolioPageMeasurement,
} from "@/lib/portfolio/engine/portfolio-smart-measure-types";

import {
  applyPortfolioPageDecisions,
  freezePortfolioPageDecision,
  getPortfolioPageMeasurementKey,
  selectPortfolioCandidateForPage,
  type PortfolioFrozenDecisionMap,
  type PortfolioPageMeasurementMap,
} from "@/lib/portfolio/engine/portfolio-smart-page-planner";


function buildPhysicalDocument(
  data: PortfolioPrintData,
  themeId: PortfolioThemeId,
): PortfolioPhysicalDocument {
  const logical =
    buildPortfolioLogicalDocument({
      title:
        data.portfolio.title,

      introText:
        data.portfolio.introText,

      conclusionText:
        data.portfolio.conclusionText,

      bioText:
        data.portfolio.bioText,

      sections:
        data.sections,

      biography:
        data.biography,

      educationIdentity:
        data.educationIdentity,

      qualificationItems:
        data.qualificationItems,

      customEvidence:
        data.customEvidence,

      preferences:
        data.portfolio.preferences,

      performanceSections:
        data.performanceSections.map(
          (section) => ({
            id:
              section.id,

            key:
              section.key,

            title:
              section.title,

            sortOrder:
              section.sortOrder,

            isEnabled:
              section.isEnabled,

            intro:
              section.intro,

            linkedOutputs:
              section.linkedOutputs,

            reports:
              section.reports.map(
                (report) => ({
                  id:
                    report.id,

                  title:
                    report.title,

                  content:
                    report.content,
                }),
              ),
          }),
        ),
    });

  return planPortfolioPhysicalDocument(
    logical,
    themeId,
  );
}


function getReportPageModel(
  page: PortfolioPhysicalPage,
): PortfolioReportPageModel | undefined {
  const payload =
    page.payload;

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


function hasDetails(
  page: PortfolioPhysicalPage,
) {
  return Boolean(
    getReportPageModel(
      page,
    )?.sections.some(
      (section) =>
        section.kind ===
          "details" &&
        section.fields.length >
          0,
    ),
  );
}


function renderPortfolioDesign(
  data: PortfolioPrintData,
  physicalDocument:
    PortfolioPhysicalDocument,
  themeId:
    PortfolioThemeId,
) {
  if (
    themeId ===
    "geometric-horizon"
  ) {
    return (
      <GeometricHorizonPortfolioPrint
        data={data}
        physicalDocument={
          physicalDocument
        }
      />
    );
  }

  if (
    themeId ===
    "editorial-atlas"
  ) {
    return (
      <EditorialAtlasPortfolioPrint
        data={data}
        physicalDocument={
          physicalDocument
        }
      />
    );
  }

  if (
    themeId ===
    "moe-official-2024"
  ) {
    return (
      <MoeOfficial2024PortfolioPrint
        data={data}
        physicalDocument={
          physicalDocument
        }
      />
    );
  }

  return (
    <MinistryElegantPortfolioPrint
      data={data}
      physicalDocument={
        physicalDocument
      }
    />
  );
}


export function PortfolioPrintDocument({
  data,
}: {
  data: PortfolioPrintData;
}) {
  const themeId =
    isPortfolioThemeId(
      data.portfolio.themeId,
    )
      ? data.portfolio.themeId
      : DEFAULT_PORTFOLIO_THEME_ID;


  const basePhysicalDocument =
    useMemo(
      () =>
        buildPhysicalDocument(
          data,
          themeId,
        ),
      [
        data,
        themeId,
      ],
    );


  const measurablePages =
    useMemo(
      () =>
        Object.values(
          basePhysicalDocument.reportPages,
        )
          .map(
            (pages) =>
              pages[0],
          )
          .filter(
            (
              page,
            ): page is PortfolioPhysicalPage =>
              Boolean(page) &&
              hasDetails(page),
          ),
      [
        basePhysicalDocument,
      ],
    );


  const [
    measurements,
    setMeasurements,
  ] =
    useState<
      PortfolioPageMeasurementMap
    >({});


  /**
   * Data/theme changes invalidate every browser measurement.
   */
  useEffect(
    () => {
      setMeasurements({});
    },
    [
      basePhysicalDocument,
    ],
  );


  const onMeasured =
    useCallback(
      (
        result:
          PortfolioPageMeasurement,
      ) => {
        const key =
          getPortfolioPageMeasurementKey(
            result.pageId,
            result.candidateId,
          );

        setMeasurements(
          (current) => {
            if (
              current[key]
            ) {
              return current;
            }

            return {
              ...current,

              [key]:
                result,
            };
          },
        );
      },
      [],
    );


  const frozenDecisions =
    useMemo<
      PortfolioFrozenDecisionMap | null
    >(
      () => {
        const decisions:
          PortfolioFrozenDecisionMap =
          {};

        for (
          const page of measurablePages
        ) {
          const candidate =
            selectPortfolioCandidateForPage(
              page.id,
              PORTFOLIO_SMART_CANDIDATES,
              measurements,
            );

          if (!candidate) {
            return null;
          }

          decisions[
            page.id
          ] =
            freezePortfolioPageDecision(
              page.id,
              candidate,
            );
        }

        return decisions;
      },
      [
        measurablePages,
        measurements,
      ],
    );


  const physicalDocument =
    useMemo(
      () => {
        if (
          frozenDecisions ===
          null
        ) {
          return basePhysicalDocument;
        }

        return applyPortfolioPageDecisions(
          basePhysicalDocument,
          frozenDecisions,
          measurements,
        );
      },
      [
        basePhysicalDocument,
        frozenDecisions,
        measurements,
      ],
    );


  const typographyStyle =
    {
      "--portfolio-a4-width":
        `${PORTFOLIO_A4.widthMm}mm`,

      "--portfolio-a4-height":
        `${PORTFOLIO_A4.heightMm}mm`,

      "--portfolio-font-stack":
        PORTFOLIO_FONT_STACK,

      "--portfolio-page-title-size":
        PORTFOLIO_TYPOGRAPHY.pageTitle.size,

      "--portfolio-section-title-size":
        PORTFOLIO_TYPOGRAPHY.sectionTitle.size,

      "--portfolio-body-size":
        PORTFOLIO_TYPOGRAPHY.body.size,

      "--portfolio-header-height-mm":
        `${physicalDocument.frame.headerHeightMm}mm`,

      "--portfolio-footer-height-mm":
        `${physicalDocument.frame.footerHeightMm}mm`,

      "--portfolio-top-safety-gap-mm":
        `${physicalDocument.frame.topSafetyGapMm}mm`,

      "--portfolio-bottom-safety-gap-mm":
        `${physicalDocument.frame.bottomSafetyGapMm}mm`,

      "--portfolio-content-top-mm":
        `${physicalDocument.frame.contentTopMm}mm`,

      "--portfolio-content-bottom-mm":
        `${physicalDocument.frame.contentBottomMm}mm`,
    } as CSSProperties;


  if (
    frozenDecisions ===
      null &&
    measurablePages.length >
      0
  ) {
    return (
      <div
        style={
          typographyStyle
        }
        data-portfolio-smart-phase="measuring"
      >
        {measurablePages.flatMap(
          (page) =>
            PORTFOLIO_SMART_CANDIDATES.map(
              (candidate) => (
                <PortfolioPageMeasurementCandidate
                  key={
                    `${page.id}::${candidate.id}`
                  }
                  data={data}
                  physicalDocument={
                    basePhysicalDocument
                  }
                  themeId={
                    themeId
                  }
                  pageId={
                    page.id
                  }
                  candidate={
                    candidate
                  }
                  onMeasured={
                    onMeasured
                  }
                />
              ),
            ),
        )}

        <div className="portfolio-smart-measuring-state">
          جارٍ تنظيم صفحات الملف...
        </div>
      </div>
    );
  }


  return (
    <div
      style={
        typographyStyle
      }
      data-portfolio-smart-phase="frozen"
    >
      {renderPortfolioDesign(
        data,
        physicalDocument,
        themeId,
      )}
    </div>
  );
}