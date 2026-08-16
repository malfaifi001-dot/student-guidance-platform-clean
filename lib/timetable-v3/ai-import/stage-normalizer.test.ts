import assert from "node:assert/strict";
import test from "node:test";

// Node's strip-types test runner needs the extension; the app's bundler does not.
import {
  normalizeTimetableAiStage,
// @ts-expect-error TS5097: test-only runtime import extension.
} from "./stage-normalizer.ts";
import {
  detectTimetableAiImportLanguage,
// @ts-expect-error TS5097: test-only runtime import extension.
} from "./language.ts";

test("normalizes Arabic and English stage aliases", () => {
  const cases: Array<[string, string]> = [
    ["ابتدائي", "ELEMENTARY"],
    ["المرحلة الابتدائية", "ELEMENTARY"],
    ["متوسط", "MIDDLE"],
    ["المرحلة المتوسطة", "MIDDLE"],
    ["ثانوي", "HIGH"],
    ["المرحلة الثانوية", "HIGH"],
    ["primary", "ELEMENTARY"],
    ["intermediate", "MIDDLE"],
    ["secondary", "HIGH"],
  ];

  for (const [input, expected] of cases) {
    assert.equal(normalizeTimetableAiStage(input), expected);
  }
});

test("canonical stages remain unchanged and unknown values are preserved", () => {
  assert.equal(normalizeTimetableAiStage("ELEMENTARY"), "ELEMENTARY");
  assert.equal(normalizeTimetableAiStage(" middle school "), "MIDDLE");
  assert.equal(normalizeTimetableAiStage("unmapped stage"), null);
});

test("detects substantial Arabic input deterministically", () => {
  assert.equal(
    detectTimetableAiImportLanguage("أريد مرحلة ابتدائية وأربع فصول"),
    "ARABIC",
  );
  assert.equal(
    detectTimetableAiImportLanguage("elementary school with 4 classes"),
    "OTHER",
  );
});
