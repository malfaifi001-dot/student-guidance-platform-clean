import assert from "node:assert/strict";
import test from "node:test";

import { selectCounselorCommitteeCases } from "./counselor-committee-report-selection";

const ownerUserId = "counselor-1";

function candidate(overrides: Partial<Parameters<typeof selectCounselorCommitteeCases>[0][number]> = {}) {
  return {
    id: "case-1",
    createdById: ownerUserId,
    status: "SUBMITTED",
    service: { slug: "committees-meetings" },
    ...overrides,
  };
}

test("selects counselor-owned submitted committee cases across historical portfolio schools", () => {
  const selected = selectCounselorCommitteeCases(
    [
      candidate({ id: "case-1" }),
      candidate({ id: "case-2" }),
      candidate({ id: "case-3" }),
    ],
    ownerUserId,
  );

  assert.deepEqual(selected.map((item) => item.id), ["case-1", "case-2", "case-3"]);
});

test("excludes other owners, unrelated services, ineligible statuses, and duplicates", () => {
  const selected = selectCounselorCommitteeCases(
    [
      candidate({ id: "case-1" }),
      candidate({ id: "case-1" }),
      candidate({ id: "other-owner", createdById: "counselor-2" }),
      candidate({ id: "other-service", service: { slug: "student-follow-up" } }),
      candidate({ id: "draft", status: "DRAFT" }),
      candidate({ id: "archived", status: "ARCHIVED" }),
    ],
    ownerUserId,
  );

  assert.deepEqual(selected.map((item) => item.id), ["case-1"]);
});

