"use client";

import { useEffect } from "react";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForWindowLoad() {
  if (document.readyState === "complete") return;

  await new Promise<void>((resolve) => {
    window.addEventListener("load", () => resolve(), { once: true });
  });
}

async function waitForFonts() {
  try {
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;

    if (fonts?.ready) {
      await fonts.ready;
    }
  } catch {
    // تجاهل فشل جاهزية الخطوط
  }
}

async function waitForFinalizedPhysicalPages(timeoutMs = 30000) {
  if (!document.querySelector(".report-two-print-document")) {
    return true;
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const composers = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-report-smart-physical-pages]",
      ),
    );

    if (
      composers.length > 0 &&
      composers.every((composer) => {
        const phase = composer.dataset.reportPhysicalPlanningPhase;
        return phase === "READY" || phase === "FROZEN";
      })
    ) {
      return true;
    }

    await sleep(50);
  }

  return false;
}

async function waitForImages(timeoutMs = 10000) {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
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
          await fonts.ready;
        }
      } catch {
        // تجاهل فشل جاهزية خطوط الإطار
      }
    }),
  );
}

export function ReportTwoSnapshotPrintController() {
  useEffect(() => {
    let cancelled = false;

    async function triggerPrint() {
      await waitForWindowLoad();
      await waitForFonts();
      const physicalPagesReady = await waitForFinalizedPhysicalPages();

      if (!physicalPagesReady || cancelled) {
        return;
      }
      await waitForImages();
      await waitForLinkedFrames();
      await waitForFrameFonts();
      await sleep(500);

      if (!cancelled) {
        window.print();
      }
    }

    void triggerPrint();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
