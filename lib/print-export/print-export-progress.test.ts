import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { formatTransferSize, getDownloadProgress } from "./print-export-progress.ts";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { getTransferMetrics } from "./print-export-transfer.ts";

test("download percentage is based on actual bytes and never reports completion early", () => {
  assert.equal(getDownloadProgress(8_400_000, 13_100_000), 64);
  assert.equal(getDownloadProgress(13_100_000, 13_100_000), 99);
});

test("unknown totals remain indeterminate while received bytes remain measurable", () => {
  assert.equal(getDownloadProgress(8_400_000, null), undefined);
  assert.equal(formatTransferSize(8_400_000), "8.0 MB");
  assert.equal(formatTransferSize(512), "1 KB");
});

test("transfer speed and remaining time use measured samples only", () => {
  const metrics = getTransferMetrics([
    { receivedBytes: 0, atMs: 0 },
    { receivedBytes: 5_000_000, atMs: 5_000 },
  ], 10_000_000);
  assert.equal(metrics.speedBytesPerSecond, 1_000_000);
  assert.equal(metrics.remainingSeconds, 5);
  assert.deepEqual(getTransferMetrics([{ receivedBytes: 5, atMs: 10 }], 10), { speedBytesPerSecond: null, remainingSeconds: null });
});

test("stalled transfers do not produce speed or ETA", () => {
  assert.deepEqual(getTransferMetrics([
    { receivedBytes: 5_000_000, atMs: 1_000 },
    { receivedBytes: 5_000_000, atMs: 6_000 },
  ], 10_000_000), { speedBytesPerSecond: null, remainingSeconds: null });
});

test("a retry starts with a fresh measurement window", () => {
  const firstAttempt = getTransferMetrics([
    { receivedBytes: 1_000_000, atMs: 1_000 },
    { receivedBytes: 2_000_000, atMs: 2_000 },
  ], 10_000_000);
  const retryAttempt = getTransferMetrics([{ receivedBytes: 0, atMs: 10_000 }], 10_000_000);
  assert.equal(firstAttempt.speedBytesPerSecond, 1_000_000);
  assert.deepEqual(retryAttempt, { speedBytesPerSecond: null, remainingSeconds: null });
});
