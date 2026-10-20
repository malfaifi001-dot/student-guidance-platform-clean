import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { isTransientCloudflareBodyFailure } from "./cloudflare-body-errors.ts";

test("Cloudflare response-body failures are classified as transient only when marked by the body reader", () => {
  assert.equal(isTransientCloudflareBodyFailure({ transientBodyFailure: true }), true);
  assert.equal(isTransientCloudflareBodyFailure(new TypeError("fetch failed")), false);
  assert.equal(isTransientCloudflareBodyFailure({ transientBodyFailure: false }), false);
});
