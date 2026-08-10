"use client";

import { useEffect, useRef } from "react";

const ASSET_READY_TIMEOUT_MS = 5000;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForWindowLoad() {
  if (document.readyState === "complete") return;

  await Promise.race([
    new Promise<void>((resolve) => {
      window.addEventListener("load", () => resolve(), { once: true });
    }),
    sleep(ASSET_READY_TIMEOUT_MS),
  ]);
}

async function waitForFonts() {
  try {
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;

    if (fonts?.ready) {
      await Promise.race([fonts.ready, sleep(ASSET_READY_TIMEOUT_MS)]);
    }
  } catch {
    // تجاهل فشل جاهزية الخطوط
  }
}

async function waitForCommittedVisiblePages(timeoutMs = 5000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const renderer = document.querySelector<HTMLElement>(
      ".report-two-print-document [data-physical-layout-renderer='true'][data-physical-layout-frozen='true']",
    );
    const physicalPages = renderer?.querySelectorAll<HTMLElement>(
      "[data-physical-page-id]",
    );
    const a4Pages = renderer?.querySelectorAll<HTMLElement>(
      ".pdf-report-page",
    );

    if (
      renderer &&
      physicalPages?.length &&
      a4Pages?.length === physicalPages.length
    ) {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      });
      return true;
    }

    await sleep(50);
  }

  return false;
}

async function waitForImages(timeoutMs = 10000) {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>("img"))
    .filter((image) => !image.closest("[data-report-measurement-only='true']"));
  const pending = images.filter((image) => !image.complete);

  if (!pending.length) return;

  await Promise.race([
    Promise.all(
      pending.map(
        (image) =>
          new Promise<void>((resolve) => {
            const settle = () => resolve();
            image.addEventListener("load", settle, { once: true });
            image.addEventListener("error", settle, { once: true });
          }),
      ),
    ),
    sleep(timeoutMs),
  ]);
}

function areLinkedFramesReady() {
  const frames = Array.from(
    document.querySelectorAll<HTMLIFrameElement>(
      [
        "iframe[data-report-linked-assessment-frame='1']",
        "iframe[data-report-linked-survey-frame='1']",
        ".linked-assessment-official-frame",
        ".linked-survey-official-frame",
        ".report-linked-assessment-frame",
        ".report-linked-survey-frame",
      ].join(","),
    ),
  );

  if (!frames.length) return true;

  return frames.every((frame) => {
    try {
      const doc = frame.contentDocument;

      return !doc || doc.readyState === "complete";
    } catch {
      return true;
    }
  });
}

async function waitForLinkedFrames(timeoutMs = 9000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (areLinkedFramesReady()) return;

    await sleep(150);
  }
}

async function waitForFrameFonts() {
  const frames = Array.from(
    document.querySelectorAll<HTMLIFrameElement>(
      [
        "iframe[data-report-linked-assessment-frame='1']",
        "iframe[data-report-linked-survey-frame='1']",
        ".linked-assessment-official-frame",
        ".linked-survey-official-frame",
        ".report-linked-assessment-frame",
        ".report-linked-survey-frame",
      ].join(","),
    ),
  );

  await Promise.all(
    frames.map(async (frame) => {
      try {
        const fonts = (
          frame.contentDocument as unknown as {
            fonts?: { ready?: Promise<unknown> };
          }
        )?.fonts;

        if (fonts?.ready) {
          await Promise.race([fonts.ready, sleep(ASSET_READY_TIMEOUT_MS)]);
        }
      } catch {
        // تجاهل فشل جاهزية خطوط الإطار
      }
    }),
  );
}

export function ReportTwoSnapshotPrintController() {
  const printTriggeredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function triggerPrint() {
      console.info("PRINT_ROUTE_LOADED");
      console.info("PRINT_REQUESTED");

      if (printTriggeredRef.current) {
        console.info("PRINT_ALREADY_TRIGGERED");
        return;
      }

      await waitForWindowLoad();
      await waitForFonts();
      console.info("FONTS_READY");

      const physicalPagesReady = await waitForCommittedVisiblePages();

      if (!physicalPagesReady || cancelled) {
        console.info("PRINT_ABORTED", {
          reason: cancelled ? "effect-cancelled" : "committed-visible-pages-timeout",
        });
        return;
      }

      console.info("PHYSICAL_LAYOUT_COMMITTED");
      console.info("VISIBLE_A4_READY");

      await waitForImages();
      console.info("IMAGES_READY");
      await waitForLinkedFrames();
      await waitForFrameFonts();

      if (cancelled) {
        console.info("PRINT_ABORTED", { reason: "effect-cancelled" });
        return;
      }

      if (printTriggeredRef.current) {
        console.info("PRINT_ALREADY_TRIGGERED");
        return;
      }

      printTriggeredRef.current = true;
      console.info("PRINT_TRIGGERED");
      window.print();
    }

    void triggerPrint();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
