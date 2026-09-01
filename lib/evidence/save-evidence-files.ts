import crypto from "crypto";
import path from "path";

import { writeEvidenceFile } from "@/lib/evidence/evidence-file-storage";
import {
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_FILES_MESSAGE,
} from "@/lib/evidence/evidence-limits";

export const MAX_EVIDENCE_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_EVIDENCE_TOTAL_SIZE = 20 * 1024 * 1024;

const ALLOWED_EVIDENCE_TYPES = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
} as const;

export type SavedEvidenceFile = {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
};

function sanitizeOriginalFileName(fileName: string) {
  const withoutPosixPath = path.posix.basename(String(fileName || ""));
  const withoutWindowsPath = path.win32.basename(withoutPosixPath);
  const normalized = withoutWindowsPath
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.slice(0, 180) || "file";
}

function getSafeExtension(file: File) {
  const safeName = sanitizeOriginalFileName(file.name);
  const rawExtension = path.extname(safeName).toLowerCase().replace(/^\./, "");
  const allowedExtensions =
    ALLOWED_EVIDENCE_TYPES[file.type as keyof typeof ALLOWED_EVIDENCE_TYPES];

  if (!allowedExtensions || !rawExtension) {
    return null;
  }

  if (!allowedExtensions.includes(rawExtension as never)) {
    return null;
  }

  return rawExtension === "jpeg" ? "jpg" : rawExtension;
}

export function validateEvidenceFile(file: File) {
  if (file.size <= 0) {
    return "يوجد ملف فارغ ضمن الشواهد.";
  }

  if (file.size > MAX_EVIDENCE_FILE_SIZE) {
    return "حجم كل شاهد يجب ألا يتجاوز 5MB.";
  }

  if (!getSafeExtension(file)) {
    return "صيغة الشاهد غير مدعومة. المسموح: PNG أو JPG أو WEBP أو PDF أو DOC أو DOCX أو XLS أو XLSX.";
  }

  return null;
}

export function validateEvidenceFiles(files: File[]) {
  if (!files.length) {
    return "لم يتم إرفاق شواهد.";
  }

  if (files.length > MAX_EVIDENCE_FILES) {
    return MAX_EVIDENCE_FILES_MESSAGE;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > MAX_EVIDENCE_TOTAL_SIZE) {
    return "إجمالي حجم الشواهد في الطلب الواحد يجب ألا يتجاوز 20MB.";
  }

  for (const file of files) {
    const validationError = validateEvidenceFile(file);

    if (validationError) {
      return validationError;
    }
  }

  return null;
}

export async function saveEvidenceFiles(params: {
  files: File[];
  schoolAccountId: string;
}) {
  const uploadedItems: SavedEvidenceFile[] = [];

  for (const file of params.files) {
    const extension = getSafeExtension(file);

    if (!extension) {
      continue;
    }

    const safeOriginalName = sanitizeOriginalFileName(file.name);
    const storedName = `${params.schoolAccountId}-${crypto.randomUUID()}.${extension}`;
    const publicUrl = `/uploads/evidence/${storedName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeEvidenceFile(storedName, buffer);

    uploadedItems.push({
      fileName: safeOriginalName,
      fileUrl: publicUrl,
      mimeType: file.type,
      size: file.size,
    });
  }

  return uploadedItems;
}
