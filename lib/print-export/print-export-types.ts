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
  printUrl?: string;
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
  fallback?: PrintExportFallback | null;
};

export type PrintExportRunResult =
  | "downloaded"
  | "opened"
  | "blocked"
  | "error"
  | null;
