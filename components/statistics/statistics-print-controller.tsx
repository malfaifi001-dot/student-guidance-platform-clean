"use client";

import { useEffect, useRef } from "react";

const INVALID_FILE_NAME_CHARACTERS = /[\\/:*?"<>|]+/g;
const PRINT_RESOURCE_WAIT_MS = 1600;
const FINAL_PAINT_WAIT_MS = 120;

function cleanTitlePart(value: string) {
  return value
    .replace(INVALID_FILE_NAME_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s،-]+|[\s،-]+$/g, "")
    .trim();
}

export function buildStatisticsPrintDocumentTitle(serviceNames: string[]) {
  const uniqueServiceNames = Array.from(
    new Set(serviceNames.map(cleanTitlePart).filter(Boolean)),
  );
  const combinedServices = uniqueServiceNames.join("، ");
  const readableServices =
    combinedServices.length > 110
      ? `${combinedServices.slice(0, 106).trim()}…`
      : combinedServices;
  return cleanTitlePart(
    ["تقرير إحصائي", readableServices].filter(Boolean).join(" - "),
  );
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

async function withTimeout(promise: Promise<unknown>, timeoutMs: number) {
  await Promise.race([promise, delay(timeoutMs)]);
}

async function waitForFonts() {
  try {
    if (document.fonts?.ready) {
      await withTimeout(document.fonts.ready, PRINT_RESOURCE_WAIT_MS);
    }
  } catch {
    // Font readiness must not prevent the browser print fallback.
  }
}

async function waitForMinistryLogo() {
  const logo = document.querySelector<HTMLImageElement>(
    "img[data-statistics-ministry-logo='true']",
  );

  if (!logo || logo.complete) return;

  await withTimeout(
    new Promise<void>((resolve) => {
      const finish = () => {
        logo.removeEventListener("load", finish);
        logo.removeEventListener("error", finish);
        resolve();
      };

      logo.addEventListener("load", finish, { once: true });
      logo.addEventListener("error", finish, { once: true });
    }),
    PRINT_RESOURCE_WAIT_MS,
  );
}

async function waitForNextPaint() {
  const painted = new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });

  await Promise.race([painted, delay(FINAL_PAINT_WAIT_MS)]);
}

export function StatisticsPrintController({
  enabled,
  serviceNames,
}: {
  enabled: boolean;
  serviceNames: string[];
}) {
  const startedRef = useRef(false);
  const printedRef = useRef(false);
  const serviceNamesKey = serviceNames.join("\u0000");

  useEffect(() => {
    const normalizedServiceNames = serviceNamesKey.split("\u0000").filter(Boolean);
    const printTitle = buildStatisticsPrintDocumentTitle(normalizedServiceNames);
    document.title = printTitle;

    if (!enabled || startedRef.current || printedRef.current) return;

    startedRef.current = true;
    let cancelled = false;

    async function printWhenReady() {
      await Promise.all([waitForFonts(), waitForMinistryLogo()]);
      await waitForNextPaint();

      if (!cancelled && !printedRef.current) {
        document.title = printTitle;
        printedRef.current = true;
        window.print();
      }
    }

    void printWhenReady();

    return () => {
      cancelled = true;
      startedRef.current = false;
    };
  }, [enabled, serviceNamesKey]);

  return null;
}
