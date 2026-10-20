import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error node's strip-types test runner imports the source extension.
import { parseByteRange } from "./http-range.ts";

test("parses full, open-ended and suffix byte ranges", () => {
  assert.deepEqual(parseByteRange("bytes=0-99", 1000), { start: 0, end: 99 });
  assert.deepEqual(parseByteRange("bytes=100-", 1000), { start: 100, end: 999 });
  assert.deepEqual(parseByteRange("bytes=-50", 1000), { start: 950, end: 999 });
  assert.deepEqual(parseByteRange("bytes=0-9999", 1000), { start: 0, end: 999 });
});

test("rejects malformed, empty and unsatisfiable ranges", () => {
  assert.equal(parseByteRange("bytes=", 1000), "invalid");
  assert.equal(parseByteRange("bytes=abc-def", 1000), "invalid");
  assert.equal(parseByteRange("bytes=1000-", 1000), "invalid");
  assert.equal(parseByteRange("bytes=50-10", 1000), "invalid");
  assert.equal(parseByteRange("bytes=0-1,4-5", 1000), "invalid");
});
