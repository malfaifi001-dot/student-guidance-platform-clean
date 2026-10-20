import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { buildPortfolioPrintRedirectPath, buildPortfolioSnapshotPrintUrl } from "./portfolio-print-entry.ts";

test("snapshot print entry uses the isolated authorized print route", () => {
  assert.equal(
    buildPortfolioSnapshotPrintUrl("snapshot/with spaces"),
    "/api/dashboard/portfolio/snapshots/snapshot%2Fwith%20spaces/print",
  );
});

test("print redirect is relative and preserves the short-lived token", () => {
  const path = buildPortfolioPrintRedirectPath("token/with spaces");
  assert.equal(path, "/portfolio-export-preview/token%2Fwith%20spaces?print=1");
  assert.equal(new URL(path, "http://localhost:3000").origin, "http://localhost:3000");
  assert.equal(new URL(path, "https://teachix.sa").origin, "https://teachix.sa");
  assert.equal(new URL(path, "https://teachix.sa").searchParams.get("print"), "1");
});

test("print redirect cannot inherit an untrusted forwarded origin", () => {
  const path = buildPortfolioPrintRedirectPath("safe-token");
  assert.equal(path.startsWith("http://"), false);
  assert.equal(path.startsWith("https://"), false);
  assert.equal(path.includes("0.0.0.0"), false);
});
