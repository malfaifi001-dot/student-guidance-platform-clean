import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { isPortfolioAuthenticatedPrintEntryUrl } from "./print-preview-capability.ts";

test("Portfolio API print entries use the system-browser redirect path", () => {
  assert.equal(
    isPortfolioAuthenticatedPrintEntryUrl(
      "https://teachix.sa/api/dashboard/portfolio/snapshots/snapshot-1/print",
    ),
    true,
  );
  assert.equal(
    isPortfolioAuthenticatedPrintEntryUrl(
      "https://teachix.sa/portfolio-export-preview/token?print=1",
    ),
    false,
  );
  assert.equal(
    isPortfolioAuthenticatedPrintEntryUrl(
      "https://teachix.sa/api/dashboard/portfolio/snapshots/snapshot-1/print/other",
    ),
    false,
  );
});
