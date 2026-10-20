import { Capacitor } from "@capacitor/core";
import {
  downloadBlobAsNativeFile,
  type NativeDownloadResult,
} from "@/lib/native/native-download";

export function createDownloadRequestId() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

export function appendDownloadRequestId(url: string, requestId: string) {
  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.set("downloadRequestId", requestId);
  return parsed.origin === window.location.origin
    ? `${parsed.pathname}${parsed.search}${parsed.hash}`
    : parsed.toString();
}

export function hasBrowserDownloadAcknowledgement(cookieName: string) {
  return document.cookie.split(";").some((entry) => entry.trim() === `${cookieName}=1`);
}

export function clearBrowserDownloadAcknowledgement(cookieName: string) {
  document.cookie = `${cookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export async function waitForBrowserDownloadAcknowledgement(
  cookieName: string,
  timeoutMs: number,
  signal: AbortSignal,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (signal.aborted) throw new Error("DIRECT_DOWNLOAD_CANCELLED");
    if (hasBrowserDownloadAcknowledgement(cookieName)) {
      clearBrowserDownloadAcknowledgement(cookieName);
      return Date.now() - startedAt;
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }

  throw new Error("DIRECT_DOWNLOAD_ACK_TIMEOUT");
}

/** Starts a same-origin browser download without buffering the response in JS. */
export function startDirectBrowserDownload(url: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("DIRECT_DOWNLOAD_BROWSER_ONLY");
  }

  const parsed = new URL(String(url || "").trim(), window.location.origin);
  if (!url || !/^https?:$/.test(parsed.protocol) || parsed.origin !== window.location.origin) {
    throw new Error("DIRECT_DOWNLOAD_INVALID_URL");
  }

  const link = document.createElement("a");
  link.href = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

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
  onProgress?: (receivedBytes: number, totalBytes: number | null) => void,
): Promise<NativeDownloadResult | null> {
  if (!response.ok) {
    throw new Error("DOWNLOAD_REQUEST_FAILED");
  }

  const fileName = getFileNameFromContentDisposition(
    response.headers.get("content-disposition"),
    fallbackFileName,
  );
  const blob = await readResponseBlob(response, onProgress);
  return downloadBlobAsFile(blob, fileName);
}

export async function readResponseBlob(
  response: Response,
  onProgress?: (receivedBytes: number, totalBytes: number | null) => void,
): Promise<Blob> {
  const totalHeader = response.headers.get("content-length");
  const totalBytes = totalHeader && /^\d+$/.test(totalHeader) ? Number(totalHeader) : null;
  if (!response.body) {
    const blob = await response.blob();
    onProgress?.(blob.size, totalBytes ?? blob.size);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  onProgress?.(0, totalBytes);
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    if (!result.value?.byteLength) continue;
    chunks.push(result.value);
    receivedBytes += result.value.byteLength;
    onProgress?.(receivedBytes, totalBytes);
  }

  const body = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Blob([body], { type: response.headers.get("content-type") || "application/octet-stream" });
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
