import assert from "node:assert/strict";
import test from "node:test";

import { toSnapshotDocument } from "./portfolio-snapshot-document";

test("new snapshot documents retain discovered counselor committee reports", () => {
  const document = toSnapshotDocument(
    {
      ok: true,
      showWeights: false,
      portfolio: { title: "ملف الإنجاز", academicYear: "2026", term: "الفصل الدراسي الأول", themeId: "ministry-elegant", status: "DRAFT", introText: "", conclusionText: "", bioText: "", description: "", preferences: {} },
      owner: { name: "سليمان السعيدي", jobTitle: "موجه طلابي" },
      school: { name: "المدرسة", logoUrl: null, principalName: null, academicYear: "2026", currentSemester: "الفصل الدراسي الأول" },
      sections: [],
      biography: {},
      educationIdentity: { vision: "", mission: "", pillars: [], values: [], strategicObjectives: [] },
      qualificationItems: [],
      performanceSections: [{
        id: "section-committee",
        key: "committees-meetings",
        title: "اللجان والاجتماعات",
        weight: 0,
        serviceSlug: "committees-meetings",
        intro: "",
        sortOrder: 1,
        isEnabled: true,
        linkedOutputs: [],
        reports: [
          { id: "case-1", itemId: "item-1", title: "محضر 1", status: "SUBMITTED", generatedAt: null, createdAt: "2026-09-07T05:10:25.630Z", evidenceCount: 0, caseTitle: "محضر 1", serviceName: "اللجان والاجتماعات", previewUrl: "/dashboard/cases/case-1", sourceType: "CASE_ENTRY", content: {} },
          { id: "case-2", itemId: "item-2", title: "محضر 2", status: "SUBMITTED", generatedAt: null, createdAt: "2026-09-07T05:19:45.269Z", evidenceCount: 0, caseTitle: "محضر 2", serviceName: "اللجان والاجتماعات", previewUrl: "/dashboard/cases/case-2", sourceType: "CASE_ENTRY", content: {} },
          { id: "case-3", itemId: "item-3", title: "محضر 3", status: "SUBMITTED", generatedAt: null, createdAt: "2026-09-07T05:25:56.796Z", evidenceCount: 0, caseTitle: "محضر 3", serviceName: "اللجان والاجتماعات", previewUrl: "/dashboard/cases/case-3", sourceType: "CASE_ENTRY", content: {} },
        ],
      }],
      customEvidence: [],
      totals: { reports: 3, evidences: 0, sections: 1 },
    } as never,
    { id: "counselor-1", schoolAccountId: "school-current" },
    new Date("2026-10-26T18:00:00.000Z"),
  );

  assert.equal(document.performanceSections[0]?.key, "committees-meetings");
  assert.equal(document.performanceSections[0]?.reports.length, 3);
  assert.equal(document.totals.reports, 3);
  assert.equal(document.totals.evidences, 0);
});
