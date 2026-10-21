import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { isPortfolioAuthenticatedPrintEntryUrl, isValidPortfolioPrintPreviewUrl, resolvePortfolioPrintPreviewUrl } from "./print-preview-capability.ts";

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

test("a same-origin token preview is the only valid iOS handoff destination", () => {
  assert.equal(
    isValidPortfolioPrintPreviewUrl(
      "https://teachix.sa/portfolio-export-preview/token-1?print=1",
      "https://teachix.sa",
    ),
    true,
  );
  assert.equal(
    isValidPortfolioPrintPreviewUrl(
      "https://teachix.sa/api/dashboard/portfolio/snapshots/snapshot-1/print",
      "https://teachix.sa",
    ),
    false,
  );
  assert.equal(
    isValidPortfolioPrintPreviewUrl(
      "https://teachix.sa/login?print=1",
      "https://teachix.sa",
    ),
    false,
  );
  assert.equal(
    isValidPortfolioPrintPreviewUrl(
      "https://evil.example/portfolio-export-preview/token-1?print=1",
      "https://teachix.sa",
    ),
    false,
  );
});

test("the authenticated handoff follows the redirect and rejects auth failures", async () => {
  const previewUrl = await resolvePortfolioPrintPreviewUrl(
    "https://teachix.sa/api/dashboard/portfolio/snapshots/snapshot-1/print",
    async () => ({
      ok: true,
      url: "https://teachix.sa/portfolio-export-preview/token-1?print=1",
    }) as Response,
  );
  assert.equal(previewUrl, "https://teachix.sa/portfolio-export-preview/token-1?print=1");

  await assert.rejects(
    resolvePortfolioPrintPreviewUrl(
      "https://teachix.sa/api/dashboard/portfolio/snapshots/snapshot-1/print",
      async () => new Response('{"code":"UNAUTHENTICATED"}', { status: 401 }),
    ),
    /PORTFOLIO_PRINT_AUTH_HANDOFF_FAILED/,
  );
});

test("Android entry detection remains independent from iOS preview mode", () => {
  assert.equal(
    isPortfolioAuthenticatedPrintEntryUrl(
      "https://teachix.sa/api/dashboard/portfolio/snapshots/snapshot-1/print",
    ),
    true,
  );
  assert.equal(
    isValidPortfolioPrintPreviewUrl(
      "https://teachix.sa/portfolio-export-preview/token-1?print=1&ios=1",
      "https://teachix.sa",
    ),
    true,
  );
});
