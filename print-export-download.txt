import { Capacitor } from "@capacitor/core";
import {
  downloadBlobAsNativeFile,
  type NativeDownloadResult,
} from "@/lib/native/native-download";

export function getFileNameFromContentDisposition(
  header: string | null,
  fallback = "download.bin",
) {
  if (!header) return fallback;

  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8.replace(/^"|"$/g, ""));
    } catch {
      return utf8.replace(/^"|"$/g, "");
    }
  }

  return header.match(/filename="?([^";]+)"?/i)?.[1] || fallback;
}

export async function downloadResponseAsFile(
  response: Response,
  fallbackFileName = "download.bin",
): Promise<NativeDownloadResult | null> {
  if (!response.ok) {
    throw new Error("DOWNLOAD_REQUEST_FAILED");
  }

  const fileName = getFileNameFromContentDisposition(
    response.headers.get("content-disposition"),
    fallbackFileName,
  );
  const blob = await response.blob();
  return downloadBlobAsFile(blob, fileName);
}

export async function downloadUrlAsFile(
  url: string,
  fallbackFileName = "download.bin",
  init?: RequestInit,
): Promise<NativeDownloadResult | null> {
  try {
    return await downloadResponseAsFile(await fetch(url, init), fallbackFileName);
  } catch (error) {
    if (Capacitor.isNativePlatform() && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("teachix:native-download-feedback", {
          detail: {
            type: "error",
            fileName: fallbackFileName,
            message: "تعذر تحميل الملف، حاول مرة أخرى",
          },
        }),
      );
    }
    throw error;
  }
}

export async function downloadBlobAsFile(
  blob: Blob,
  fileName: string,
): Promise<NativeDownloadResult | null> {
  const safeFileName = fileName.trim() || "report.pdf";
  const nativeResult = await downloadBlobAsNativeFile(blob, safeFileName);
  if (nativeResult) return nativeResult;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = safeFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return null;
}

export function buildPrintUrl(url: string): string {
  const trimmed = String(url || "").trim();

  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    parsed.searchParams.set("print", "1");

    if (/^https?:\/\//i.test(trimmed)) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const [beforeHash, hash = ""] = trimmed.split("#");
    const [path, query = ""] = beforeHash.split("?");
    const searchParams = new URLSearchParams(query);

    searchParams.set("print", "1");

    return `${path}?${searchParams.toString()}${hash ? `#${hash}` : ""}`;
  }
}
