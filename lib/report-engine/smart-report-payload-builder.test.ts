import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEvidence } from "@/lib/report-engine/smart-report-payload-builder";

function evidence(id: string, fileUrl?: string, title = id) {
  return { id, fileUrl, title };
}

test("deduplicates the same physical evidence URL across source IDs", () => {
  const result = normalizeEvidence({
    evidences: [evidence("normal-id", "/uploads/evidence/report.pdf", "Normal")],
    caseEvidences: [evidence("case-id", "/uploads/evidence/report.pdf", "Case")],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "normal-id");
  assert.equal(result[0].title, "Normal");
});

test("ignores query strings and hashes when comparing evidence URLs", () => {
  const result = normalizeEvidence({
    evidences: [evidence("first", "/uploads/evidence/report.pdf?download=1")],
    caseEvidences: [evidence("second", "/uploads/evidence/report.pdf#page=1")],
  });

  assert.deepEqual(result.map((item) => item.id), ["first"]);
});

test("retains genuinely different evidence URLs", () => {
  const result = normalizeEvidence({
    evidences: [evidence("first", "/uploads/evidence/one.pdf")],
    caseEvidences: [evidence("second", "/uploads/evidence/two.pdf")],
  });

  assert.deepEqual(result.map((item) => item.id), ["first", "second"]);
});

test("falls back to evidence IDs when no URL is available", () => {
  const result = normalizeEvidence({
    evidences: [
      { ...evidence("first"), attachmentId: "attachment-first" },
      { ...evidence("second"), attachmentId: "attachment-second" },
    ],
  });

  assert.deepEqual(result.map((item) => item.id), ["first", "second"]);
});

test("deduplicates no-URL evidence with the same ID", () => {
  const result = normalizeEvidence({
    evidences: [{ ...evidence("same-id"), attachmentId: "attachment-one" }],
    caseEvidences: [{ ...evidence("same-id"), attachmentId: "attachment-two" }],
  });

  assert.deepEqual(result.map((item) => item.id), ["same-id"]);
});

test("retains normal evidence for non-teacher activity reports", () => {
  const result = normalizeEvidence({
    evidences: [evidence("activity-leader-id", "/uploads/activity-leader.jpg")],
    caseEvidences: [],
    activityAssignment: { submittedEvidenceItems: [] },
    teacherActivitySubmission: {
      submittedEvidenceItems: [evidence("teacher-id", "/uploads/teacher.jpg")],
    },
  });

  assert.deepEqual(result.map((item) => item.id), ["activity-leader-id"]);
});

test("keeps teacher submission evidence as the fallback source", () => {
  const result = normalizeEvidence({
    evidences: [],
    caseEvidences: [],
    activityAssignment: { submittedEvidenceItems: [] },
    teacherActivitySubmission: {
      submittedEvidenceItems: [evidence("teacher-id", "/uploads/evidence/activity.pdf")],
    },
  });

  assert.deepEqual(result.map((item) => item.id), ["teacher-id"]);
});
