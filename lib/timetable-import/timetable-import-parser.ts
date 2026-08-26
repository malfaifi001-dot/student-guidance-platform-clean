import "server-only";

import * as XLSX from "xlsx";

import { PaddleOcrAdapter } from "./paddle-ocr-adapter";
import { normalizeOcrExtraction, normalizeTimetableRows } from "./timetable-import-normalizer";
import { validateTimetableImport } from "./timetable-import-validator";
import type { TimetableImportResult, TimetableImportSourceType } from "./timetable-import-types";

function sourceTypeForFile(fileName: string, mimeType: string): TimetableImportSourceType {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "pdf" || mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(extension || "")) return "IMAGE";
  return "EXCEL";
}

export async function parseTimetableImport(input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<TimetableImportResult> {
  const sourceType = sourceTypeForFile(input.fileName, input.mimeType);

  if (sourceType === "EXCEL") {
    const workbook = XLSX.read(input.buffer, { type: "buffer", cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0] || ""];
    const rows = sheet
      ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" })
      : [];
    return validateTimetableImport(normalizeTimetableRows(rows, sourceType));
  }

  const extraction = await new PaddleOcrAdapter().extractTimetable({
    fileBuffer: input.buffer,
    mimeType: input.mimeType,
  });
  return validateTimetableImport(normalizeOcrExtraction(extraction, sourceType));
}
