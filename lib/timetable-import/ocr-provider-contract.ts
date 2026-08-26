import "server-only";

import type { OcrExtraction } from "./timetable-import-types";

export interface OcrProvider {
  extractTimetable(input: {
    filePath?: string;
    fileBuffer?: Buffer;
    mimeType: string;
  }): Promise<OcrExtraction>;
}
