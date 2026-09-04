"use client";

import {
  useEffect,
} from "react";

import type {
  PortfolioPrintData,
} from "@/components/portfolio/print/portfolio-print-types";

import type {
  PortfolioPhysicalDocument,
} from "@/lib/portfolio/layout/portfolio-physical-types";

import type {
  PortfolioThemeId,
} from "@/lib/portfolio/portfolio-theme-registry";

import {
  applyPortfolioSmartCandidate,
  type PortfolioSmartCandidate,
} from "@/lib/portfolio/engine/portfolio-smart-candidates";

import type {
  PortfolioPageMeasurement,
} from "@/lib/portfolio/engine/portfolio-smart-measure-types";

import {
  measurePortfolioPhysicalPage,
} from "@/lib/portfolio/engine/portfolio-smart-measure";
import { portfolioPhysicalTrace } from "@/lib/portfolio/debug/portfolio-physical-trace";

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


type Props = {
  data: PortfolioPrintData;

  physicalDocument:
    PortfolioPhysicalDocument;

  themeId:
    PortfolioThemeId;

  pageId:
    string;

  candidate:
    PortfolioSmartCandidate;

  onMeasured: (
    result:
      PortfolioPageMeasurement,
  ) => void;
};


function renderDesign(
  data:
    PortfolioPrintData,
  document:
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
        physicalDocument={document}
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
        physicalDocument={document}
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
        physicalDocument={document}
      />
    );
  }

  return (
    <MinistryElegantPortfolioPrint
      data={data}
      physicalDocument={document}
    />
  );
}


function getPhysicalPageFromMarker(
  marker: HTMLElement,
) {
  return marker.closest<HTMLElement>(
    [
      ".portfolio-report-page",
      ".atlas-page",
      ".hzn-page",
      ".moe24-page",
      ".portfolio-page",
    ].join(","),
  );
}


export function PortfolioPageMeasurementCandidate({
  data,
  physicalDocument,
  themeId,
  pageId,
  candidate,
  onMeasured,
}: Props) {
  const candidateDocument =
    applyPortfolioSmartCandidate(
      physicalDocument,
      candidate,
      false,
    );

  useEffect(() => {
    let disposed =
      false;

    let stablePasses =
      0;

    let previousFingerprint =
      "";

    const root =
      document.querySelector<HTMLElement>(
        `[data-portfolio-page-measurement="${CSS.escape(pageId)}::${CSS.escape(candidate.id)}"]`,
      );

    if (!root) {
      return;
    }


    const findPage =
      () => {
        const marker =
          root.querySelector<HTMLElement>(
            `[data-portfolio-page-id="${CSS.escape(pageId)}"]`,
          );

        if (!marker) {
          return null;
        }

        return (
          getPhysicalPageFromMarker(
            marker,
          ) ?? marker
        );
      };


    const measure =
      () => {
        if (disposed) {
          return;
        }

        const page =
          findPage();

        if (!page) {
          requestAnimationFrame(
            measure,
          );

          return;
        }

        portfolioPhysicalTrace("MEASURE_REQUEST", { pageId, candidateId: candidate.id });

        const fingerprint =
          [
            page.textContent
              ?.length ?? 0,

            page.scrollHeight,

            page.clientHeight,

            page
              .getBoundingClientRect()
              .height,

            page
              .querySelectorAll(
                "img",
              ).length,
          ].join(":");

        stablePasses =
          fingerprint ===
          previousFingerprint
            ? stablePasses + 1
            : 0;

        previousFingerprint =
          fingerprint;

        if (
          stablePasses >= 2
        ) {
          const result = measurePortfolioPhysicalPage(page, pageId, candidate);
          portfolioPhysicalTrace("MEASURE_RESULT", { ...result });
          if (!result.stable) portfolioPhysicalTrace("WARNING", { type: "MEASUREMENT_UNSTABLE", pageId, candidateId: candidate.id });
          if (!Number.isFinite(result.overflowPx)) portfolioPhysicalTrace("WARNING", { type: "INVALID_MEASUREMENT", pageId, candidateId: candidate.id, overflowPx: result.overflowPx });
          onMeasured(result);

          return;
        }

        requestAnimationFrame(
          measure,
        );
      };


    const start =
      async () => {
        if (
          document.fonts?.ready
        ) {
          await document.fonts.ready;
        }

        const images =
          Array.from(
            root.querySelectorAll<HTMLImageElement>(
              "img",
            ),
          );

        await Promise.all(
          images.map(
            (image) => {
              if (
                image.complete
              ) {
                return Promise.resolve();
              }

              return new Promise<void>(
                (resolve) => {
                  image.addEventListener(
                    "load",
                    () => resolve(),
                    {
                      once: true,
                    },
                  );

                  image.addEventListener(
                    "error",
                    () => resolve(),
                    {
                      once: true,
                    },
                  );
                },
              );
            },
          ),
        );

        requestAnimationFrame(
          () =>
            requestAnimationFrame(
              measure,
            ),
        );
      };


    const resizeObserver =
      new ResizeObserver(
        () => {
          stablePasses = 0;

          requestAnimationFrame(
            measure,
          );
        },
      );

    resizeObserver.observe(
      root,
    );


    const mutationObserver =
      new MutationObserver(
        () => {
          stablePasses = 0;

          requestAnimationFrame(
            measure,
          );
        },
      );

    mutationObserver.observe(
      root,
      {
        subtree: true,
        childList: true,
        characterData: true,
      },
    );


    void start();


    return () => {
      disposed = true;

      resizeObserver.disconnect();

      mutationObserver.disconnect();
    };
  }, [
    candidate,
    onMeasured,
    pageId,
  ]);


  return (
    <div
      data-portfolio-page-measurement={
        `${pageId}::${candidate.id}`
      }
      aria-hidden="true"
      style={{
        position:
          "fixed",

        insetInlineStart:
          "-100000px",

        top:
          0,

        width:
          "210mm",

        visibility:
          "hidden",

        pointerEvents:
          "none",
      }}
    >
      {renderDesign(
        data,
        candidateDocument,
        themeId,
      )}
    </div>
  );
}
