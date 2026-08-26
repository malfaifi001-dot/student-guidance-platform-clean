import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

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

function sanitizeFileName(fileName: string) {
  const sanitized = fileName
    .replace(/[\\/:*?"<>|\r\n]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);

  return sanitized || "report.pdf";
}

function getSafePreviewUrl(url: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    const parsed = new URL(url, window.location.origin);
    const isSameOrigin = parsed.origin === window.location.origin;
    const isTeachixOrigin =
      parsed.protocol === "https:" &&
      ["teachix.sa", "www.teachix.sa"].includes(parsed.hostname.toLowerCase());

    if (!isSameOrigin && !isTeachixOrigin) return null;
    return parsed.toString();
  } catch {
    return null;
  }
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

  // TeachixPdf is Android-only. Keep this path unchanged for Android.
  if (Capacitor.getPlatform() !== "android") {
    if (Capacitor.getPlatform() !== "ios") return null;

    const safeFileName = sanitizeFileName(fileName);

    try {
      const data = await blobToBase64(blob);
      const path = `teachix-exports/${Date.now()}-${safeFileName}`;
      const result = await Filesystem.writeFile({
        path,
        data,
        directory: Directory.Cache,
        recursive: true,
      });

      await Share.share({
        title: safeFileName,
        url: result.uri,
        dialogTitle: "مشاركة ملف PDF",
      });

      dispatchDownloadFeedback("success", safeFileName);
      return { fileName: safeFileName, uri: result.uri };
    } catch (error) {
      dispatchDownloadFeedback(
        "error",
        safeFileName,
        "تعذر تجهيز الملف للمشاركة، حاول مرة أخرى",
      );
      throw error;
    }
  }

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

  const safeFeedbackFileName = sanitizeFileName(fileName);

  try {
    if (Capacitor.getPlatform() === "android") {
      const safeFileName = fileName.trim() || "report.pdf";
      await TeachixPdf.renderHtmlToPdf({ url, fileName: safeFileName });
      return true;
    }

    if (Capacitor.getPlatform() !== "ios") return false;

    const safeFileName = sanitizeFileName(fileName);

    const safeUrl = getSafePreviewUrl(url);
    if (!safeUrl) throw new Error("UNSAFE_PRINT_PREVIEW_URL");

    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: safeUrl });
    return true;
  } catch (error) {
    dispatchDownloadFeedback("error", safeFeedbackFileName, "تعذر فتح معاينة PDF، حاول مرة أخرى");
    throw error;
  }
}
