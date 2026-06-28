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