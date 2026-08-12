"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportDesignId } from "@/components/report-engine/design-renderers/report-design-renderer";
import { ReportTwoPrintDocument } from "@/components/report-2/report-two-print-document";

type ReportTwoPdfExportSnapshot = {
  template: any;
  context: Record<string, string>;
  previewCase: any;
  designTemplateId?: ReportDesignId;
  variantId?: string | null;
};

export function ReportTwoPdfExportPreview({
  snapshot,
  printMode = false,
}: {
  snapshot: ReportTwoPdfExportSnapshot;
  printMode?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pdfReady, setPdfReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setPdfReady(false);

    async function markReady() {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const wrapper = wrapperRef.current;

      if (!wrapper || cancelled) return;

      const images = Array.from(wrapper.querySelectorAll("img"));

      await Promise.all(
        images.map((image) => {
          if (image.complete) return Promise.resolve();

          return new Promise<void>((resolve) => {
            const finish = () => {
              image.removeEventListener("load", finish);
              image.removeEventListener("error", finish);
              resolve();
            };

            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });

            if (image.complete) finish();
          });
        }),
      );

      if (cancelled || !wrapper.querySelector(".pdf-report-page")) return;

      setPdfReady(true);
    }

    void markReady();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      data-report-two-pdf-ready={pdfReady ? "1" : undefined}
    >
      <ReportTwoPrintDocument
        snapshot={snapshot}
        autoPrint={printMode}
      />
    </div>
  );
}
