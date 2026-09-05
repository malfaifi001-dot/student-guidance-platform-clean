"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import dynamic from "next/dynamic";

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
import { portfolioPhysicalTrace } from "@/lib/portfolio/debug/portfolio-physical-trace";

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

const PortfolioPageMeasurementCandidate = dynamic(
  () => import("@/components/portfolio/print/portfolio-page-measurement-candidate").then((module) => module.PortfolioPageMeasurementCandidate),
  { ssr: false },
);


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
  const pendingMeasurements = useRef<PortfolioPageMeasurementMap>({});
  const measurementFlushFrame = useRef<number | null>(null);


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

        if (pendingMeasurements.current[key]) return;
        pendingMeasurements.current[key] = result;

        if (measurementFlushFrame.current !== null) return;
        measurementFlushFrame.current = window.requestAnimationFrame(() => {
          measurementFlushFrame.current = null;
          const pending = pendingMeasurements.current;
          pendingMeasurements.current = {};
          setMeasurements((current) => {
            let next = current;
            for (const [pendingKey, pendingResult] of Object.entries(pending)) {
              if (current[pendingKey]) continue;
              if (next === current) next = { ...current };
              next[pendingKey] = pendingResult;
            }
            return next;
          });
        });
      },
      [],
    );

  useEffect(() => () => {
    if (measurementFlushFrame.current !== null) {
      window.cancelAnimationFrame(measurementFlushFrame.current);
      measurementFlushFrame.current = null;
    }
    pendingMeasurements.current = {};
  }, [basePhysicalDocument]);


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

  useEffect(() => {
    if (frozenDecisions === null) return;
    const frame = window.requestAnimationFrame(() => {
      const pages = Array.from(document.querySelectorAll<HTMLElement>("[data-portfolio-page-type], .portfolio-page, .atlas-page, .hzn-page, .moe24-page"));
      pages.forEach((page) => {
        const content = page.querySelector<HTMLElement>("[data-portfolio-safe-content]");
        const footer = page.querySelector<HTMLElement>("[data-portfolio-footer-boundary]");
        const header = page.querySelector<HTMLElement>("[data-portfolio-header-boundary]");
        const pageRect = page.getBoundingClientRect();
        const contentRect = content?.getBoundingClientRect();
        const footerRect = footer?.getBoundingClientRect();
        const headerRect = header?.getBoundingClientRect();
        if (!content || !contentRect || !footerRect) return;
        const pageId = page.dataset.portfolioPageId || page.querySelector<HTMLElement>("[data-portfolio-page-id]")?.dataset.portfolioPageId || page.dataset.pageLabel || "unknown";
        const meaningfulElements = Array.from(content.querySelectorAll<HTMLElement>("*:not(style):not(script):not([aria-hidden=\"true\"]):not([data-portfolio-measurement-candidate])"))
          .filter((element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && style.position !== "absolute" && style.position !== "fixed" && rect.width > 0 && rect.height > 0 && !element.closest("[data-portfolio-measurement-candidate]");
          });
        const lastMeasuredElement = meaningfulElements.reduce<HTMLElement | null>((last, element) => {
          if (!last || element.getBoundingClientRect().bottom > last.getBoundingClientRect().bottom) return element;
          return last;
        }, null);
        const actualContentBottomPx = lastMeasuredElement?.getBoundingClientRect().bottom ?? contentRect.top;
        const footerTopPx = footerRect.top;
        const overlapPx = actualContentBottomPx - footerTopPx;
        const payload = { pageId, pageType: page.dataset.portfolioPageType || (page.className.match(/portfolio-report-page|portfolio-service-output-page/)?.[0] ?? "unknown"), safeContentTopPx: contentRect.top, safeContentBottomPx: contentRect.bottom, actualContentBottomPx, footerTopPx, overlapPx, measuredElementCount: meaningfulElements.length, lastMeasuredElementTag: lastMeasuredElement?.tagName ?? null, lastMeasuredElementClass: lastMeasuredElement?.className ?? null, pageHeightPx: pageRect.height, headerBottomPx: headerRect?.bottom ?? null };
        portfolioPhysicalTrace("FOOTER_GEOMETRY", payload);
        if (overlapPx > 1) portfolioPhysicalTrace("WARNING", { type: "CONTENT_CROSSES_FOOTER", pageId, overlapPx });
        const safeContent = content;
        const isEmpty = !safeContent.textContent?.trim() && !safeContent.querySelector("img, table, svg, [data-portfolio-smart-role]");
        if (isEmpty) portfolioPhysicalTrace("WARNING", { type: "EMPTY_PHYSICAL_PAGE", pageId, pageType: payload.pageType });
        if (page.dataset.portfolioPageType === "service-output") {
          portfolioPhysicalTrace("SERVICE_OUTPUT_RENDERED", { ...payload, outputId: page.dataset.portfolioOutputId || null, chunkIndex: page.dataset.portfolioChunkIndex || null, rowCount: safeContent.querySelectorAll("tbody tr").length });
          if (overlapPx > 1) portfolioPhysicalTrace("WARNING", { type: "SERVICE_OUTPUT_OVERFLOW", pageId, overlapPx, outputId: page.dataset.portfolioOutputId || null });
        }
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [physicalDocument, frozenDecisions]);


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
      data-portfolio-pdf-ready="true"
    >
      {renderPortfolioDesign(
        data,
        physicalDocument,
        themeId,
      )}
    </div>
  );
}
