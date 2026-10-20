import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { formatTransferSize, getDownloadProgress } from "./print-export-progress.ts";

test("download percentage is based on actual bytes and never reports completion early", () => {
  assert.equal(getDownloadProgress(8_400_000, 13_100_000), 64);
  assert.equal(getDownloadProgress(13_100_000, 13_100_000), 99);
});

test("unknown totals remain indeterminate while received bytes remain measurable", () => {
  assert.equal(getDownloadProgress(8_400_000, null), undefined);
  assert.equal(formatTransferSize(8_400_000), "8.0 MB");
  assert.equal(formatTransferSize(512), "1 KB");
});
