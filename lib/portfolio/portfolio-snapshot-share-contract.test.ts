import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { buildPortfolioSnapshotSharePath, buildPortfolioSnapshotWhatsAppUrl, isValidPortfolioSnapshotShareToken } from "./portfolio-snapshot-share-contract.ts";

test("Portfolio share tokens require an unguessable URL-safe shape", () => {
  assert.equal(isValidPortfolioSnapshotShareToken("a".repeat(64)), true);
  assert.equal(isValidPortfolioSnapshotShareToken("short"), false);
  assert.equal(isValidPortfolioSnapshotShareToken("a".repeat(64) + "/"), false);
});

test("share path encodes the token and WhatsApp text encodes Arabic content", () => {
  const token = "a".repeat(63) + "_";
  const path = buildPortfolioSnapshotSharePath(token);
  assert.equal(path, `/portfolio-share/${token}`);
  const url = buildPortfolioSnapshotWhatsAppUrl("معلم Teachix", `https://teachix.sa${path}`);
  assert.equal(new URL(url).hostname, "wa.me");
  assert.match(decodeURIComponent(new URL(url).searchParams.get("text") || ""), /معلم Teachix/);
});
