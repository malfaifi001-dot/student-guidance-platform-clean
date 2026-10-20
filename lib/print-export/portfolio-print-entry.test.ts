import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { buildPortfolioSnapshotPrintUrl } from "./portfolio-print-entry.ts";

test("snapshot print entry uses the isolated authorized print route", () => {
  assert.equal(
    buildPortfolioSnapshotPrintUrl("snapshot/with spaces"),
    "/api/dashboard/portfolio/snapshots/snapshot%2Fwith%20spaces/print",
  );
});
