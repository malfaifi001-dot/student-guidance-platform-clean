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
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } })
      .fonts;

    if (fonts?.ready) {
      await fonts.ready;
    }
  } catch {
    // Printing should continue even when the browser does not expose font readiness.
  }
}

async function waitForImages() {
  const images = Array.from(document.images);

  await Promise.all(
    images.map(async (image) => {
      if (image.complete) return;

      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

export function GuardianSummonsPrintController({
  shouldPrint,
}: {
  shouldPrint: boolean;
}) {
  useEffect(() => {
    if (!shouldPrint) return;

    let cancelled = false;

    async function triggerPrint() {
      await waitForWindowLoad();
      await waitForFonts();
      await waitForImages();
      await sleep(250);

      if (!cancelled) {
        window.print();
      }
    }

    void triggerPrint();

    return () => {
      cancelled = true;
    };
  }, [shouldPrint]);

  return null;
}
