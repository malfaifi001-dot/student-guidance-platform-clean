export function getDownloadProgress(receivedBytes: number, totalBytes: number | null) {
  if (!Number.isSafeInteger(receivedBytes) || receivedBytes < 0 || !totalBytes || !Number.isSafeInteger(totalBytes) || totalBytes <= 0) return undefined;
  return Math.min(99, Math.floor((receivedBytes / totalBytes) * 100));
}

export function formatTransferSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 0 : 1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTransferRate(bytesPerSecond: number | null | undefined) {
  if (!bytesPerSecond || !Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "";
  return `${formatTransferSize(bytesPerSecond)}/ث`;
}

export function formatRemainingTime(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "";
  const rounded = Math.ceil(seconds);
  if (rounded < 60) return `${rounded} ث`;
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return remainder ? `${minutes} د ${remainder} ث` : `${minutes} د`;
}
