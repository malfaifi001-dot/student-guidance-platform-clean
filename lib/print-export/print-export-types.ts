import type { AnalyticsEventName } from "@/lib/analytics/analytics-events";

export type PrintExportStatus =
  | "idle"
  | "loading"
  | "success"
  | "blocked"
  | "error";

export type PrintExportFallback = {
  printUrl: string;
  fileName?: string;
  title?: string;
  message?: string;
};

export type PrintExportActionOptions = {
  exportUrl?: string;
  /** Browser delivery defaults to the existing fetch/blob behavior. */
  deliveryMode?: "blob" | "direct";
  /** Optional response-received signal for a direct browser download. */
  directDownloadAcknowledgement?: {
    cookieNamePrefix: string;
    timeoutMs?: number;
    trace?: "portfolio";
  };
  /** Probe/poll a persisted export before handing the final file to the browser. */
  pendingDownload?: {
    statusUrl: string;
    pollIntervalMs?: number;
    timeoutMs?: number;
  };
  /** Existing Capacitor Browser fallback for large files the native Blob bridge cannot hold safely. */
  nativeLargeFileFallbackUrl?: string;
  printUrl?: string;
  /** Print an already-mounted document before falling back to exportUrl. */
  preparedPrint?: {
    /** Explicit isolated print target; never inferred from the current page. */
    rootSelector: string;
    readySelector: string;
    pageSelector: string;
    requiredPageCount: number;
    expectedSnapshotId?: string;
    timeoutMs?: number;
  };
  fileName?: string;
  method?: "GET" | "POST";
  body?: unknown;
  successTitle?: string;
  successMessage?: string;
  blockedTitle?: string;
  blockedMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
  progressTitle?: string;
  progressMessage?: string;
  fallbackProgressTitle?: string;
  fallbackProgressMessage?: string;
  /** Share a generated PDF through the native iOS/Android share sheet. */
  nativeDelivery?: "share";
  analytics?: {
    eventName: AnalyticsEventName;
    params?: import("@/lib/analytics/analytics-types").AnalyticsEventParams;
  };
};

export type PrintExportModal = {
  status: Exclude<PrintExportStatus, "idle">;
  title: string;
  message: string;
  progress?: number;
  receivedBytes?: number;
  totalBytes?: number | null;
  speedBytesPerSecond?: number | null;
  remainingSeconds?: number | null;
  phase?: "preparing" | "ready" | "downloading" | "browser-handoff";
  fallback?: PrintExportFallback | null;
};

export type PrintExportRunResult =
  | "downloaded"
  | "opened"
  | "blocked"
  | "error"
  | null;
