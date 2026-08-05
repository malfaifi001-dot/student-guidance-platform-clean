import assert from "node:assert/strict";
import test from "node:test";

import {
  repairPotentialUtf8Mojibake,
  repairPotentialWorkflowOptionValue,
} from "./repair-utf8-mojibake";

test("keeps valid Arabic unchanged", () => {
  const value = "الفصل الدراسي الأول";

  assert.equal(repairPotentialUtf8Mojibake(value), value);
});

test("keeps valid English unchanged", () => {
  const value = "Weekly school report";

  assert.equal(repairPotentialUtf8Mojibake(value), value);
});

test("keeps numbers and dates unchanged", () => {
  assert.equal(repairPotentialUtf8Mojibake("1447 هـ"), "1447 هـ");
  assert.equal(repairPotentialUtf8Mojibake("2026-07-06"), "2026-07-06");
});

test("repairs known UTF-8 mojibake Arabic", () => {
  assert.equal(
    repairPotentialUtf8Mojibake("Ø§Ù„ÙØµÙ„ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ Ø§Ù„Ø£ÙˆÙ„"),
    "الفصل الدراسي الأول",
  );
});

test("repairs mixed Arabic and English safely", () => {
  assert.equal(
    repairPotentialUtf8Mojibake("ØªÙ‚Ø±ÙŠØ± OneDrive"),
    "تقرير OneDrive",
  );
});

test("normalization is idempotent", () => {
  const once = repairPotentialUtf8Mojibake("Ø£Ø¯Ø§Ø¡ Ø§Ù„ÙˆØ§Ø¬Ø¨Ø§Øª Ø§Ù„ÙˆØ¸ÙŠÙÙŠØ©");
  const twice = repairPotentialUtf8Mojibake(once);

  assert.equal(once, "أداء الواجبات الوظيفية");
  assert.equal(twice, once);
});

test("null undefined and empty values are safe", () => {
  assert.equal(repairPotentialUtf8Mojibake(null), null);
  assert.equal(repairPotentialUtf8Mojibake(undefined), undefined);
  assert.equal(repairPotentialUtf8Mojibake(""), "");
});

test("technical option values and urls stay unchanged", () => {
  assert.equal(
    repairPotentialWorkflowOptionValue("weekly-school-report"),
    "weekly-school-report",
  );
  assert.equal(
    repairPotentialWorkflowOptionValue("__OTHER__"),
    "__OTHER__",
  );
  assert.equal(
    repairPotentialWorkflowOptionValue("https://example.com/report"),
    "https://example.com/report",
  );
});
