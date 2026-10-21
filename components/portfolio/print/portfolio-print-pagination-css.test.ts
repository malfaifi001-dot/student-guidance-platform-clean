import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { PORTFOLIO_PRINT_PAGINATION_CSS } from "./portfolio-print-pagination-css.ts";

test("keeps each frozen Portfolio page as one A4 print item", () => {
  assert.match(PORTFOLIO_PRINT_PAGINATION_CSS, /box-sizing:\s*border-box/);
  assert.match(PORTFOLIO_PRINT_PAGINATION_CSS, /break-inside:\s*avoid-page/);
  assert.match(PORTFOLIO_PRINT_PAGINATION_CSS, /page-break-inside:\s*avoid/);
  assert.match(PORTFOLIO_PRINT_PAGINATION_CSS, /height:\s*297mm/);
  assert.match(PORTFOLIO_PRINT_PAGINATION_CSS, /page-break-after:\s*always/);
});

test("removes preview flex fragmentation without changing the Ministry cover order", () => {
  assert.match(PORTFOLIO_PRINT_PAGINATION_CSS, /\.atlas-root[\s\S]*display:\s*block/);
  assert.match(PORTFOLIO_PRINT_PAGINATION_CSS, /\.hzn-root[\s\S]*display:\s*block/);
  assert.match(PORTFOLIO_PRINT_PAGINATION_CSS, /\.moe24-root[\s\S]*display:\s*block/);
  assert.doesNotMatch(PORTFOLIO_PRINT_PAGINATION_CSS, /\.portfolio-print-root\s*\{[^}]*display:\s*block/);
});
