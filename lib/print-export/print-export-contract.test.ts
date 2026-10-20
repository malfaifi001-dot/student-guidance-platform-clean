import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { isCompletePortfolioPrintTarget } from "./print-export-contract.ts";

const base = {
  targetKind: "portfolio",
  ready: true,
  pageCount: 4,
  requiredPageCount: 4,
  snapshotId: "snapshot-1",
  expectedSnapshotId: "snapshot-1",
  containsApplicationUi: false,
};

test("dashboard content is never an eligible Portfolio print target", () => {
  assert.equal(isCompletePortfolioPrintTarget({ ...base, targetKind: "dashboard" }), false);
  assert.equal(isCompletePortfolioPrintTarget({ ...base, containsApplicationUi: true }), false);
});

test("cover-only and incomplete documents are not ready", () => {
  assert.equal(isCompletePortfolioPrintTarget({ ...base, pageCount: 1 }), false);
  assert.equal(isCompletePortfolioPrintTarget({ ...base, ready: false }), false);
});

test("all frozen pages and the requested snapshot are required", () => {
  assert.equal(isCompletePortfolioPrintTarget(base), true);
  assert.equal(isCompletePortfolioPrintTarget({ ...base, snapshotId: "snapshot-2" }), false);
});
