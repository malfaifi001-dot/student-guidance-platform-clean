import { Capacitor, registerPlugin } from "@capacitor/core";

type NativePdfResult = {
  fileName: string;
  uri: string;
};

export type NativeDownloadResult = NativePdfResult;

type TeachixPdfPlugin = {
  saveFile(options: {
    data: string;
    fileName: string;
    mimeType: string;
  }): Promise<NativeDownloadResult>;
  savePdf(options: { data: string; fileName: string }): Promise<NativePdfResult>;
  renderHtmlToPdf(options: { url: string; fileName: string }): Promise<NativePdfResult>;
};

const TeachixPdf = registerPlugin<TeachixPdfPlugin>("TeachixPdf");

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.split(",", 2)[1] || "");
    };
    reader.onerror = () => reject(reader.error || new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(blob);
  });
}

function getBlobMimeType(blob: Blob, fileName: string) {
  if (blob.type) return blob.type;

  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "csv") return "text/csv";
  if (extension === "zip") return "application/zip";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function dispatchDownloadFeedback(
  type: "success" | "error",
  fileName: string,
  message?: string,
) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("teachix:native-download-feedback", {
      detail: { type, fileName, message },
    }),
  );
}

export async function downloadBlobAsNativeFile(
  blob: Blob,
  fileName: string,
): Promise<NativeDownloadResult | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const safeFileName = fileName.trim() || "report.pdf";
  try {
    const data = await blobToBase64(blob);
    const result = await TeachixPdf.saveFile({
      data,
      fileName: safeFileName,
      mimeType: getBlobMimeType(blob, safeFileName),
    });
    dispatchDownloadFeedback("success", result.fileName || safeFileName);
    return result;
  } catch (error) {
    dispatchDownloadFeedback(
      "error",
      safeFileName,
      "تعذر تحميل الملف، حاول مرة أخرى",
    );
    throw error;
  }
}

export async function savePrintPreviewAsNativePdf(url: string, fileName: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const safeFileName = fileName.trim() || "report.pdf";
  await TeachixPdf.renderHtmlToPdf({ url, fileName: safeFileName });
  return true;
}
