import "server-only";

import type { OcrProvider } from "./ocr-provider-contract";
import type { OcrBlock, OcrPage } from "./timetable-import-types";

function getUploadFilename(mimeType: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
  };

  return `timetable-upload${extensions[mimeType.toLowerCase()] || ".bin"}`;
}

export class PaddleOcrAdapter implements OcrProvider {
  async extractTimetable(input: {
    filePath?: string;
    fileBuffer?: Buffer;
    mimeType: string;
  }) {
    const configuredEndpoint = process.env.TIMETABLE_OCR_URL?.trim();
    if (!configuredEndpoint) {
      throw new Error("TIMETABLE_OCR_URL is not configured.");
    }
    const endpoint = configuredEndpoint.replace(/\/$/, "").endsWith("/ocr")
      ? configuredEndpoint.replace(/\/$/, "")
      : `${configuredEndpoint.replace(/\/$/, "")}/ocr`;

    if (!input.fileBuffer) {
      throw new Error("OCR input must be provided as a file buffer.");
    }

    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(input.fileBuffer)], { type: input.mimeType }),
      getUploadFilename(input.mimeType),
    );

    const response = await fetch(endpoint, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      throw new Error(`OCR provider returned HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as {
      text?: unknown;
      tables?: unknown;
      confidence?: unknown;
      pages?: unknown;
      blocks?: unknown;
    };

    return {
      text: typeof payload.text === "string" ? payload.text : undefined,
      tables: payload.tables,
      confidence:
        typeof payload.confidence === "number" ? payload.confidence : null,
      pages: Array.isArray(payload.pages) ? (payload.pages as OcrPage[]) : undefined,
      blocks: Array.isArray(payload.blocks) ? (payload.blocks as OcrBlock[]) : undefined,
    };
  }
}
