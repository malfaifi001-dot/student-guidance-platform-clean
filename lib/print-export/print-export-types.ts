export type PrintExportStatus =
  | "idle"
  | "loading"
  | "success"
  | "blocked"
  | "error";

export type PrintExportFallback = {
  printUrl: string;
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
};

export type PrintExportModal = {
  status: Exclude<PrintExportStatus, "idle">;
  title: string;
  message: string;
  fallback?: PrintExportFallback | null;
};

export type PrintExportRunResult =
  | "downloaded"
  | "opened"
  | "blocked"
  | "error"
  | null;
