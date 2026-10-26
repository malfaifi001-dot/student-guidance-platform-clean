import assert from "node:assert/strict";
import test from "node:test";

import { adaptCounselorCommitteeCaseToPortfolioReport } from "./portfolio-case-report-adapter";

test("adapts a submitted committee case and preserves evidence-free reports", () => {
  const report = adaptCounselorCommitteeCaseToPortfolioReport({
    id: "case-1",
    title: "محضر لجنة التوجيه",
    status: "SUBMITTED",
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    submittedAt: new Date("2026-10-01T11:00:00.000Z"),
    service: { slug: "committees-meetings", name: "اللجان والاجتماعات" },
    values: [
      { fieldKey: "meeting_date", value: "2026-10-01", field: { key: "meeting_date", label: "تاريخ الاجتماع", type: "DATE" } },
      { fieldKey: "purpose", value: "متابعة خطة الدعم", field: { key: "purpose", label: "الغرض", type: "TEXT" } },
    ],
    evidences: [],
  });

  assert.equal(report.reportType, "MEETING_REPORT");
  assert.equal(report.title, "محضر لجنة التوجيه");
  assert.equal(report.primaryFields[0]?.label, "تاريخ الاجتماع");
  assert.equal(report.detailFields[0]?.label, "الغرض");
  assert.equal(report.evidenceItems.length, 0);
});

test("adapts committee rows into a structured table and counts evidence input", () => {
  const report = adaptCounselorCommitteeCaseToPortfolioReport({
    id: "case-2",
    title: "اجتماع لجنة",
    status: "SUBMITTED",
    createdAt: new Date("2026-10-02T10:00:00.000Z"),
    service: { name: "اللجان والاجتماعات" },
    values: [{
      fieldKey: "committee_items",
      jsonValue: [{ agenda: "الخطة", recommendation: "اعتمادها" }],
      field: { key: "committee_items", label: "جدول الاجتماع", type: "REPEATER" },
    }],
    evidences: [{ id: "evidence-1", fileName: "minutes.pdf", fileUrl: "/uploads/evidence/minutes.pdf", mimeType: "application/pdf" }],
  });

  assert.equal(report.tables.length, 1);
  assert.equal(report.tables[0]?.rows.length, 1);
  assert.equal(report.evidenceItems.length, 1);
});
