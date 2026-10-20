export type TransferSample = {
  receivedBytes: number;
  atMs: number;
};

export function getTransferMetrics(samples: readonly TransferSample[], totalBytes: number | null) {
  if (samples.length < 2) {
    return { speedBytesPerSecond: null, remainingSeconds: null };
  }

  const first = samples[0];
  const last = samples[samples.length - 1];
  const elapsedMs = last.atMs - first.atMs;
  const deltaBytes = last.receivedBytes - first.receivedBytes;
  if (elapsedMs <= 0 || deltaBytes <= 0) {
    return { speedBytesPerSecond: null, remainingSeconds: null };
  }

  const speedBytesPerSecond = deltaBytes / (elapsedMs / 1000);
  const remainingSeconds = totalBytes !== null && totalBytes >= last.receivedBytes
    ? Math.max(0, (totalBytes - last.receivedBytes) / speedBytesPerSecond)
    : null;

  return { speedBytesPerSecond, remainingSeconds };
}
