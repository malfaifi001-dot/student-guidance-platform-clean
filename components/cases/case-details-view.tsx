import { isPrivateReportFieldKey } from "@/lib/report-engine/report-private-fields";
import { extractSmartReportTable } from "@/lib/report-engine/report-structured-table-extractor";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  ImageIcon,
  PencilLine,
  Table2,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";

import { CaseValueRenderer } from "@/components/cases/case-value-renderer";
import { EvidencePreviewGrid } from "@/components/evidence/evidence-preview-grid";
import { ReportDeleteAction } from "@/components/reports/report-delete-action";
import {
  formatWorkflowDisplayValue,
  getWorkflowFieldLabel,
  type WorkflowFieldLike,
  type WorkflowValueLike,
} from "@/lib/workflow-values/workflow-display-value";

type CaseDetailsViewProps = {
  caseEntry: any;
  reportTwoSnapshotId?: string | null;
  reportTwoStatus?: "DRAFT" | "APPROVED" | null;
  reportTwoTitle?: string | null;
};

type FieldLookupItem = WorkflowFieldLike & {
  key?: string | null;
  label?: string | null;
};

type CommitteeTableRow = {
  agenda: string;
  discussion: string;
  recommendation: string;
};

type CommitteeMemberRow = {
  name: string;
  role: string;
  signature: string;
};

const SMART_CASE_TITLE_FALLBACK_LABELS: Record<string, string> = {
  positive_behavior_discipline:
    "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
  behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
};

const COMMITTEE_SERVICE_SLUG = "committees-meetings";

function buildFieldMap(caseEntry: any) {
  const map = new Map<string, FieldLookupItem>();

  caseEntry.workflow?.steps?.forEach((step: any) => {
    step.fields?.forEach((field: any) => {
      if (!field?.key) return;

      map.set(field.key, {
        key: field.key,
        label: field.label,
        type: field.type,
        options: field.options || [],
      });
    });
  });

  return map;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_\s]+/g, " ")
    .trim();
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function shouldHideCaseValue(fieldKey: string) {
  const key = String(fieldKey || "").trim();

  if (isPrivateReportFieldKey(key)) {
    return true;
  }

  return (
    [
      "student",
      "guardian",
      "metadata",
      "selectedStudent",
      "studentSnapshot",
      "guardianSnapshot",
      "primary_student_id",
    ].includes(key) ||
    key.startsWith("selected_students_") ||
    key.endsWith("__other") ||
    key.startsWith("assessment_") ||
    key.startsWith("intervention_")
  );
}

function shouldHideCommitteeMainValue(fieldKey: string) {
  return ["committee_items", "committee_members"].includes(fieldKey);
}

function normalizeCaseValue(
  value: any,
  fieldMap: Map<string, FieldLookupItem>,
): WorkflowValueLike {
  const fieldKey = value.field?.key || value.fieldKey || "";
  const fieldFromWorkflow = fieldMap.get(fieldKey);

  return {
    id: value.id,
    fieldKey,
    value: value.value,
    jsonValue: value.jsonValue,
    field: value.field
      ? {
          key: value.field.key || fieldKey,
          label: value.field.label || fieldFromWorkflow?.label || fieldKey,
          type: value.field.type || fieldFromWorkflow?.type,
          options: value.field.options || fieldFromWorkflow?.options || [],
        }
      : fieldFromWorkflow
        ? fieldFromWorkflow
        : {
            key: fieldKey,
            label: fieldKey,
            options: [],
          },
  };
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "غير محدد";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

function getCaseStatusLabel(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "SUBMITTED") return "مرسلة";
  if (status === "ARCHIVED") return "مؤرشفة";

  return status || "غير محدد";
}

function getReportStatusLabel(status?: string | null) {
  if (status === "DRAFT") return "مسودة";
  if (status === "GENERATED") return "مولد";
  if (status === "APPROVED") return "معتمد";
  if (status === "ARCHIVED") return "مؤرشف";

  return status || "غير محدد";
}

function normalizeSmartCaseTitleText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSmartCaseTitle(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text || text === "null" || text === "undefined" || text.length > 140) {
    return "";
  }

  return text;
}

function stringifySmartCaseTitleCandidate(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return cleanSmartCaseTitle(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = stringifySmartCaseTitleCandidate(item);

      if (candidate) {
        return candidate;
      }
    }

    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of [
      "program_name",
      "programName",
      "program",
      "guidanceProgram",
      "guidance_program",
      "selectedProgram",
      "activityName",
      "activity_name",
      "title",
      "name",
      "label",
      "value",
    ]) {
      const candidate = stringifySmartCaseTitleCandidate(record[key]);

      if (candidate) {
        return candidate;
      }
    }
  }

  return "";
}

function isGenericSmartCaseTitle(title: string) {
  const normalized = normalizeSmartCaseTitleText(title);

  return (
    !normalized ||
    normalized === "بدون عنوان" ||
    normalized === "حاله بدون عنوان" ||
    normalized === "حالة بدون عنوان" ||
    normalized === "حاله جديده" ||
    normalized === "حالة جديدة" ||
    normalized.includes("برنامج ارشادي جديد") ||
    normalized.includes("positive_behavior_discipline")
  );
}

function extractSmartCaseTitleSelectedValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractSmartCaseTitleSelectedValues(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      ...extractSmartCaseTitleSelectedValues(record.value),
      ...extractSmartCaseTitleSelectedValues(record.id),
      ...extractSmartCaseTitleSelectedValues(record.key),
      ...extractSmartCaseTitleSelectedValues(record.slug),
      ...extractSmartCaseTitleSelectedValues(record.label),
      ...extractSmartCaseTitleSelectedValues(record.name),
    ];
  }

  return [];
}

function isSmartTitleLikeCaseField(value: any) {
  const text = normalizeSmartCaseTitleText(
    [value?.fieldKey, value?.field?.key, value?.field?.label]
      .filter(Boolean)
      .join(" "),
  );

  return (
    text.includes("program") ||
    text.includes("activity") ||
    text.includes("title") ||
    text.includes("برنامج") ||
    text.includes("النشاط") ||
    text.includes("عنوان") ||
    text.includes("موضوع")
  );
}

function getSmartCaseOptionLabel(value: any) {
  const selectedValues = extractSmartCaseTitleSelectedValues(
    value?.jsonValue ?? value?.value,
  );

  const options = Array.isArray(value?.field?.options)
    ? value.field.options
    : [];

  for (const selectedValue of selectedValues) {
    const cleanSelected = String(selectedValue).trim();

    if (!cleanSelected) {
      continue;
    }

    const fallbackLabel = SMART_CASE_TITLE_FALLBACK_LABELS[cleanSelected];

    if (fallbackLabel) {
      return fallbackLabel;
    }

    const option = options.find((item: any) => {
      return (
        String(item?.value || "").trim() === cleanSelected ||
        String(item?.label || "").trim() === cleanSelected
      );
    });

    if (option?.label) {
      return cleanSmartCaseTitle(option.label);
    }
  }

  return "";
}

function getSmartCaseValueTitle(value: any) {
  return (
    getSmartCaseOptionLabel(value) ||
    stringifySmartCaseTitleCandidate(value?.jsonValue) ||
    stringifySmartCaseTitleCandidate(value?.value)
  );
}

function getSmartCaseDisplayTitle(caseEntry: any) {
  const values = Array.isArray(caseEntry.values) ? caseEntry.values : [];

  for (const value of values) {
    if (!isSmartTitleLikeCaseField(value)) {
      continue;
    }

    const candidate = getSmartCaseValueTitle(value);

    if (candidate && !isGenericSmartCaseTitle(candidate)) {
      return candidate;
    }
  }

  const savedTitle = cleanSmartCaseTitle(caseEntry.title);

  if (savedTitle && !isGenericSmartCaseTitle(savedTitle)) {
    return savedTitle;
  }

  return caseEntry.service?.name || "تفاصيل الحالة";
}

function getLatestReport(caseEntry: any) {
  return Array.isArray(caseEntry.guidanceReports)
    ? caseEntry.guidanceReports[0] || null
    : null;
}

function getReportPreviewUrl(report: any) {
  if (!report?.id) {
    return "";
  }

  return `/dashboard/report/${report.id}/preview${
    report.templateId
      ? `?template=${encodeURIComponent(report.templateId)}`
      : ""
  }`;
}

function getRawCaseValueByKey(
  values: WorkflowValueLike[],
  keys: string[],
): WorkflowValueLike | null {
  const normalizedKeys = keys.map((key) => normalizeText(key));

  return (
    values.find((value) => {
      const key = value.field?.key || value.fieldKey || "";
      return normalizedKeys.includes(normalizeText(key));
    }) || null
  );
}

function displayCaseValue(
  value: WorkflowValueLike | null,
  workflowValues: WorkflowValueLike[],
) {
  if (!value) return "غير محدد";

  const display: unknown = formatWorkflowDisplayValue(value, workflowValues);

  if (display === null || display === undefined || display === "") {
    return "غير محدد";
  }

  if (
    typeof display === "string" ||
    typeof display === "number" ||
    typeof display === "boolean"
  ) {
    return String(display);
  }

  if (Array.isArray(display)) {
    const text = display
      .map((item: unknown) =>
        typeof item === "string" || typeof item === "number"
          ? String(item)
          : "",
      )
      .filter(Boolean)
      .join("، ");

    return text || "غير محدد";
  }

  return "بيانات محفوظة";
}

function formatCommitteeRows(
  value: unknown,
  fieldMap: Map<string, FieldLookupItem>,
): CommitteeTableRow[] {
  const table = extractSmartReportTable({
    value: { fieldKey: "committee_items", jsonValue: value },
    fields: Array.from(fieldMap.values()),
  });

  return (table?.rows || []).map((row) => ({
    agenda: row.cells.agenda || "غير محدد",
    discussion: row.cells.discussion || "غير محدد",
    recommendation: row.cells.recommendation || "غير محدد",
  }));
}

function formatCommitteeMembers(
  value: unknown,
  fieldMap: Map<string, FieldLookupItem>,
): CommitteeMemberRow[] {
  const table = extractSmartReportTable({
    value: { fieldKey: "committee_members", jsonValue: value },
    fields: Array.from(fieldMap.values()),
  });

  return (table?.rows || []).map((row) => ({
    name: row.cells.name || "غير محدد",
    role: row.cells.role || "غير محدد",
    signature: row.cells.signature || "غير مضاف",
  }));
}

type AssessmentStudentSummary = {
  index: number;
  name: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
};

type AssessmentInterventionSummary = {
  title: string;
  targetType: string;
  studentsCount: string;
  students: AssessmentStudentSummary[];
  studentsNamesText: string;
  subjects: string;
  grades: string;
  classrooms: string;
  averagePercentage: string;
  recommendedAction: string;
};

function getValueByKey(values: WorkflowValueLike[], key: string) {
  return values.find((value) => (value.field?.key || value.fieldKey) === key);
}

function getValueTextByKey(values: WorkflowValueLike[], key: string) {
  const value = getValueByKey(values, key);

  if (!value) return "";

  if (typeof value.value === "string" && value.value.trim()) {
    return value.value.trim();
  }

  if (typeof value.jsonValue === "string" && value.jsonValue.trim()) {
    return value.jsonValue.trim();
  }

  return "";
}

function getValueJsonByKey(values: WorkflowValueLike[], key: string) {
  return getValueByKey(values, key)?.jsonValue;
}

function formatAssessmentTargetType(value: string) {
  if (value === "STUDENT_SUPPORT") return "تدخل فردي";
  if (value === "STUDENT_EXCELLENCE") return "تعزيز وتميز";
  if (value === "STUDENT_GROUP_CUSTOM") return "خطة جماعية مخصصة";
  if (value === "STUDENT_GROUP_SUBJECT") return "خطة جماعية حسب مادة";
  if (value === "CLASSROOM_SUPPORT") return "خطة فصل";
  if (value === "GRADE_SUPPORT") return "خطة صف دراسي";
  if (value === "SUBJECT_SUPPORT") return "تدخل علاجي لمادة";

  return value || "غير محدد";
}

function buildAssessmentStudents(value: unknown): AssessmentStudentSummary[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const record = item as Record<string, unknown>;

      return {
        index: Number(record.index) || index + 1,
        name:
          cleanText(record.name) ||
          cleanText(record.fullName) ||
          "طالب غير محدد",
        nationalId: cleanText(record.nationalId) || null,
        grade: cleanText(record.grade) || null,
        classroom: cleanText(record.classroom) || null,
      };
    });
}

function buildAssessmentInterventionSummary(
  values: WorkflowValueLike[],
): AssessmentInterventionSummary | null {
  const source = getValueTextByKey(values, "assessment_source");

  if (source !== "assessment-center") {
    return null;
  }

  const students = buildAssessmentStudents(
    getValueJsonByKey(values, "assessment_students_json"),
  );

  const studentsNamesText =
    getValueTextByKey(values, "assessment_students_names_text") ||
    students.map((student) => student.name).join("، ");

  return {
    title:
      getValueTextByKey(values, "intervention_title") ||
      getValueTextByKey(values, "assessment_analysis_title") ||
      "تدخل من مركز التحليل",
    targetType: formatAssessmentTargetType(
      getValueTextByKey(values, "intervention_target_type"),
    ),
    studentsCount:
      getValueTextByKey(values, "assessment_students_count") ||
      String(students.length || 0),
    students,
    studentsNamesText,
    subjects: getValueTextByKey(values, "assessment_subjects") || "غير محدد",
    grades: getValueTextByKey(values, "assessment_grades") || "غير محدد",
    classrooms:
      getValueTextByKey(values, "assessment_classrooms") || "غير محدد",
    averagePercentage:
      getValueTextByKey(values, "assessment_average_percentage") || "غير محدد",
    recommendedAction:
      getValueTextByKey(values, "intervention_recommended_action") ||
      "غير محدد",
  };
}

function AssessmentInterventionSummaryCard({
  summary,
}: {
  summary: AssessmentInterventionSummary;
}) {
  const visibleStudents = summary.students.slice(0, 8);
  const hiddenStudentsCount = Math.max(
    summary.students.length - visibleStudents.length,
    0,
  );

  return (
    <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-emerald-700">
            بيانات التدخل من مركز التحليل
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-950">
            {summary.title}
          </h2>

          <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
            {summary.recommendedAction}
          </p>
        </div>

        <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
          {summary.targetType}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <SummaryCard
          icon={<UsersRound className="h-5 w-5" />}
          label="عدد الطلاب"
          value={summary.studentsCount}
        />

        <SummaryCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="المواد"
          value={summary.subjects}
        />

        <SummaryCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="الصفوف"
          value={summary.grades}
        />

        <SummaryCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="متوسط التحليل"
          value={`${summary.averagePercentage}%`}
        />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-white p-4">
        <p className="text-sm font-black text-slate-950">الطلاب المستهدفون</p>

        {visibleStudents.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {visibleStudents.map((student) => (
              <div
                key={`${student.index}-${student.name}`}
                className="rounded-2xl bg-slate-50 px-4 py-3"
              >
                <p className="text-sm font-black text-slate-950">
                  {student.index}. {student.name}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  {[
                    student.grade,
                    student.classroom ? `فصل ${student.classroom}` : null,
                    student.nationalId ? `هوية ${student.nationalId}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "بيانات الطالب غير مكتملة"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm font-bold text-slate-500">
            {summary.studentsNamesText || "لا توجد أسماء طلاب محفوظة."}
          </p>
        )}

        {hiddenStudentsCount > 0 ? (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black text-amber-700">
            ويوجد {hiddenStudentsCount} طلاب آخرون محفوظون للتقرير.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function getSavedReports(caseEntry: any) {
  return Array.isArray(caseEntry.guidanceReports)
    ? caseEntry.guidanceReports.filter((report: any) => Boolean(report?.id))
    : [];
}

function asReportSnapshotRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getReportVariantName(report: any) {
  const snapshot = asReportSnapshotRecord(report?.templateSnapshot);

  return (
    String(snapshot.variantShortName || snapshot.variantName || "").trim() ||
    "تقرير محفوظ"
  );
}

function getReportDateLabel(report: any) {
  return formatDate(report?.generatedAt || report?.createdAt || null);
}

function SavedReportsPanel({
  caseId,
  reports,
}: {
  caseId: string;
  reports: any[];
}) {
  if (!reports.length) {
    return null;
  }

  const visibleReports = reports.slice(0, 6);
  const prepareHref = `/dashboard/report-2/cases/${encodeURIComponent(caseId)}/prepare`;

  return (
    <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-emerald-700">
            التقارير المحفوظة
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-950">
            آخر التقارير الصادرة لهذه الحالة
          </h2>

          <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
            افتح نسخة محفوظة ثابتة، أو أصدر تقريرًا جديدًا من بيانات الحالة
            الحالية.
          </p>
        </div>

        <Link
          href={prepareHref}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800"
        >
          <FileText className="h-4 w-4" />
          إصدار تقرير جديد
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleReports.map((report: any) => (
          <Link
            key={report.id}
            href={`/dashboard/report/${report.id}/preview`}
            className="group rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-950">
                  {report.title || "تقرير محفوظ"}
                </p>

                <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                  {getReportVariantName(report)}
                </p>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                {getReportStatusLabel(report.status)}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs font-black text-slate-500">
              <span>{getReportDateLabel(report)}</span>
              <span className="text-emerald-700 transition group-hover:translate-x-[-3px]">
                فتح التقرير ←
              </span>
            </div>
          </Link>
        ))}
      </div>

      {reports.length > visibleReports.length ? (
        <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-500 ring-1 ring-emerald-100">
          يوجد {reports.length - visibleReports.length} تقارير أخرى محفوظة لهذه
          الحالة.
        </p>
      ) : null}
    </section>
  );
}
export function CaseDetailsView({
  caseEntry,
  reportTwoSnapshotId = null,
  reportTwoStatus = null,
  reportTwoTitle = null,
}: CaseDetailsViewProps) {
  const displayTitle = getSmartCaseDisplayTitle(caseEntry);
  const fieldMap = buildFieldMap(caseEntry);
  const latestReport = getLatestReport(caseEntry);
  const latestReportUrl = getReportPreviewUrl(latestReport);
  const savedReports = getSavedReports(caseEntry);

  const workflowValues: WorkflowValueLike[] = (caseEntry.values || []).map(
    (value: any) => normalizeCaseValue(value, fieldMap),
  );

  const displayValues = workflowValues.filter((value: WorkflowValueLike) => {
    const key = value.field?.key || value.fieldKey || "";
    return !shouldHideCaseValue(key);
  });

  const evidenceItems =
    caseEntry.evidences?.map((item: any) => ({
      id: item.id,
      fileName: item.fileName || "ملف",
      fileUrl: item.fileUrl || "#",
      mimeType: item.mimeType || "application/octet-stream",
      size: item.size || 0,
    })) || [];

  const reportTwoSnapshotHref = reportTwoSnapshotId
    ? `/dashboard/report-2/snapshots/${reportTwoSnapshotId}/preview`
    : null;
  const isGuardianSummons = caseEntry.service?.slug === "guardian-summons";
  const primaryReportHref = isGuardianSummons
    ? `/dashboard/guardian-summons/${encodeURIComponent(caseEntry.id)}/preview`
    : reportTwoSnapshotHref ||
      `/dashboard/report-2/cases/${encodeURIComponent(caseEntry.id)}/prepare`;
  const primaryReportLabel = isGuardianSummons
    ? "إصدار استدعاء"
    : reportTwoSnapshotHref
      ? reportTwoStatus === "APPROVED"
        ? "معاينة التقرير المعتمد"
        : "معاينة مسودة التقرير"
      : "إصدار تقرير جديد";
  const reportIsApproved = reportTwoStatus === "APPROVED";
  const reportDeleteAction = reportTwoSnapshotId ? (
    <ReportDeleteAction
      reportId={reportTwoSnapshotId}
      reportTitle={reportTwoTitle || displayTitle || "تقرير الحالة"}
      caseTitle={displayTitle || caseEntry.title || "الحالة"}
      reportStatus={reportTwoStatus || "DRAFT"}
      deleteEndpoint={`/api/dashboard/report-2/snapshots/${encodeURIComponent(reportTwoSnapshotId)}`}
      reportTwoDraftStorage={{
        caseId: caseEntry.id,
        serviceSlug: caseEntry.service?.slug || "general",
      }}
      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
      {reportIsApproved ? "حذف التقرير المعتمد" : "حذف مسودة التقرير"}
    </ReportDeleteAction>
  ) : null;

  const isCommitteesCase = caseEntry.service?.slug === COMMITTEE_SERVICE_SLUG;

  if (isCommitteesCase) {
    const committeeItemsValue = getRawCaseValueByKey(workflowValues, [
      "committee_items",
    ]);

    const committeeMembersValue = getRawCaseValueByKey(workflowValues, [
      "committee_members",
    ]);

    const committeeRows = formatCommitteeRows(
      committeeItemsValue?.jsonValue ?? committeeItemsValue?.value,
      fieldMap,
    );

    const committeeMembers = formatCommitteeMembers(
      committeeMembersValue?.jsonValue ?? committeeMembersValue?.value,
      fieldMap,
    );

    const committeeType = displayCaseValue(
      getRawCaseValueByKey(workflowValues, [
        "committee_type",
        "committeeType",
        "meeting_type",
      ]),
      workflowValues,
    );

    const semester = displayCaseValue(
      getRawCaseValueByKey(workflowValues, ["semester", "term"]),
      workflowValues,
    );

    const week = displayCaseValue(
      getRawCaseValueByKey(workflowValues, ["week", "school_week"]),
      workflowValues,
    );

    const day = displayCaseValue(
      getRawCaseValueByKey(workflowValues, ["day", "meeting_day"]),
      workflowValues,
    );

    const gregorianDate = displayCaseValue(
      getRawCaseValueByKey(workflowValues, [
        "meeting_date",
        "gregorianDate",
        "gregorian_date",
      ]),
      workflowValues,
    );

    const hijriDate = displayCaseValue(
      getRawCaseValueByKey(workflowValues, ["hijri_date", "hijriDate"]),
      workflowValues,
    );

    const extraValues = displayValues.filter((value) => {
      const key = value.field?.key || value.fieldKey || "";
      return !shouldHideCommitteeMainValue(key);
    });

    return (
      <div className="space-y-5" dir="rtl">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                  محضر اجتماع
                </span>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  {getCaseStatusLabel(caseEntry.status)}
                </span>

                {latestReport ? (
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                    تقرير: {getReportStatusLabel(latestReport.status)}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 text-3xl font-black leading-10 text-slate-950">
                {displayTitle || "محضر لجنة/اجتماع"}
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
                هذه خلاصة المحضر. راجع الجدول، ثم أصدر التقارير عند الاكتمال.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Link
                href="/dashboard/cases"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowRight className="h-4 w-4" />
                الحالات
              </Link>

              <Link
                href={`/dashboard/cases/${caseEntry.id}/edit`}
                aria-label="تعديل الحالة"
                title="تعديل الحالة"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
              >
                <PencilLine className="h-4 w-4" />
                تعديل الحالة
              </Link>

              <Link
                href={primaryReportHref}
                className={[
                  "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black text-white transition",
                  reportTwoSnapshotHref
                    ? reportIsApproved
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-sky-600 hover:bg-sky-700"
                    : "bg-emerald-700 hover:bg-emerald-800",
                ].join(" ")}
              >
                <FileText className="h-4 w-4" />
                {primaryReportLabel}
              </Link>
              {reportDeleteAction}
            </div>
          </div>
        </section>

        {reportTwoSnapshotHref ? (
          <section
            className={[
              "rounded-[2rem] border px-5 py-4 shadow-sm",
              reportIsApproved
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : "border-sky-200 bg-sky-50 text-sky-950",
            ].join(" ")}
          >
            <h2 className="text-base font-black">
              {reportIsApproved
                ? "هذه الحالة مرتبطة بتقرير معتمد"
                : "هذه الحالة مرتبطة بتقرير مسودة"}
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 opacity-80">
              {reportIsApproved
                ? "يمكنك تعديل بيانات الحالة، وسيتم تحديث البيانات المرتبطة داخل التقرير مع بقاء التقرير معتمدًا."
                : "يمكنك تعديل بيانات الحالة، وسيتم تحديث البيانات المرتبطة داخل التقرير بعد الحفظ."}
            </p>
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="نوع الاجتماع"
            value={committeeType}
          />

          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="التاريخ"
            value={
              hijriDate !== "غير محدد"
                ? `${gregorianDate} · ${hijriDate}`
                : gregorianDate
            }
            helper={`${semester} · ${week} · ${day}`}
          />

          <SummaryCard
            icon={<Table2 className="h-5 w-5" />}
            label="بنود الاجتماع"
            value={`${committeeRows.length || 0} بند`}
          />

          <SummaryCard
            icon={<UsersRound className="h-5 w-5" />}
            label="أعضاء اللجنة"
            value={`${committeeMembers.length || 0} عضو`}
          />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-sky-600">الأهم أولًا</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                جدول الاجتماع
              </h2>
            </div>

            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
              {committeeRows.length || 0} صف
            </span>
          </div>

          {committeeRows.length ? (
            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
              <div className="grid grid-cols-[64px_1fr_1fr_1fr] bg-slate-950 text-xs font-black text-white">
                <div className="px-4 py-3 text-center">#</div>
                <div className="px-4 py-3">جدول الأعمال</div>
                <div className="px-4 py-3">محور النقاش</div>
                <div className="px-4 py-3">التوصية</div>
              </div>

              {committeeRows.map((row, index) => (
                <div
                  key={`${row.agenda}-${index}`}
                  className="grid grid-cols-[64px_1fr_1fr_1fr] border-t border-slate-100 bg-white text-sm font-bold leading-7 text-slate-700"
                >
                  <div className="flex items-center justify-center bg-slate-50 px-4 py-4 font-black text-slate-500">
                    {index + 1}
                  </div>
                  <div className="px-4 py-4">{row.agenda}</div>
                  <div className="px-4 py-4">{row.discussion}</div>
                  <div className="px-4 py-4">{row.recommendation}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptySimpleBox text="لا يوجد جدول اجتماع محفوظ." />
          )}
        </section>

        {committeeMembers.length ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black text-emerald-600">الاعتماد</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                أعضاء اللجنة
              </h2>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {committeeMembers.map((member, index) => (
                <article
                  key={`${member.name}-${index}`}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 ring-1 ring-slate-100">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">
                        {member.name}
                      </p>
                      <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                        {member.role}
                      </p>
                      <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">
                        التوقيع: {member.signature}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {evidenceItems.length > 0 ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black text-violet-600">
                الشواهد والمرفقات
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                الشواهد
              </h2>
            </div>

            <div className="mt-5">
              <EvidencePreviewGrid items={evidenceItems} />
            </div>
          </section>
        ) : null}

        <details className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-sm font-black text-slate-700">
            عرض تفاصيل أكثر
          </summary>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {extraValues.map((value: WorkflowValueLike, index: number) => {
              const key = value.field?.key || value.fieldKey || "";
              const label = getWorkflowFieldLabel(value, index);
              const displayValue = formatWorkflowDisplayValue(
                value,
                workflowValues,
              );

              return (
                <CaseValueRenderer
                  key={value.id || key}
                  label={label}
                  value={displayValue}
                />
              );
            })}

            {extraValues.length === 0 ? (
              <EmptySimpleBox text="لا توجد تفاصيل إضافية." />
            ) : null}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                ملف الحالة
              </span>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                {getCaseStatusLabel(caseEntry.status)}
              </span>

              {latestReport ? (
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                  تقرير: {getReportStatusLabel(latestReport.status)}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 text-3xl font-black leading-10 text-slate-950">
              {displayTitle}
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
              راجع الحالة، ثم استكملها أو أصدر التقارير.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Link
              href="/dashboard/cases"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowRight className="h-4 w-4" />
              الحالات
            </Link>

            <Link
              href={`/dashboard/cases/${caseEntry.id}/edit`}
              aria-label="تعديل الحالة"
              title="تعديل الحالة"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              <PencilLine className="h-4 w-4" />
              تعديل الحالة
            </Link>

            <Link
              href={primaryReportHref}
              className={[
                "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black text-white transition",
                reportTwoSnapshotHref
                  ? reportIsApproved
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-sky-600 hover:bg-sky-700"
                  : "bg-emerald-700 hover:bg-emerald-800",
              ].join(" ")}
            >
              <FileText className="h-4 w-4" />
              {primaryReportLabel}
            </Link>
            {reportDeleteAction}
          </div>
        </div>
      </section>

      {reportTwoSnapshotHref ? (
        <section
          className={[
            "rounded-[2rem] border px-5 py-4 shadow-sm",
            reportIsApproved
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-sky-200 bg-sky-50 text-sky-950",
          ].join(" ")}
        >
          <h2 className="text-base font-black">
            {reportIsApproved
              ? "هذه الحالة مرتبطة بتقرير معتمد"
              : "هذه الحالة مرتبطة بتقرير مسودة"}
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 opacity-80">
            {reportIsApproved
              ? "يمكنك تعديل بيانات الحالة، وسيتم تحديث البيانات المرتبطة داخل التقرير مع بقاء التقرير معتمدًا."
              : "يمكنك تعديل بيانات الحالة، وسيتم تحديث البيانات المرتبطة داخل التقرير بعد الحفظ."}
          </p>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="الخدمة"
          value={caseEntry.service?.name || "غير محددة"}
        />

        {caseEntry.student ? (
          <SummaryCard
            icon={<UserRound className="h-5 w-5" />}
            label="الطالب/الطالبة"
            value={caseEntry.student.fullName}
            helper={[
              caseEntry.student.stage,
              caseEntry.student.grade,
              caseEntry.student.classroom
                ? `فصل ${caseEntry.student.classroom}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ) : null}

        <SummaryCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="آخر تحديث"
          value={formatDate(caseEntry.updatedAt || caseEntry.createdAt)}
        />

        {evidenceItems.length > 0 ? (
          <SummaryCard
            icon={<ImageIcon className="h-5 w-5" />}
            label="الشواهد"
            value={`${evidenceItems.length} شاهد`}
          />
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-black text-sky-600">البيانات</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            بيانات الحالة
          </h2>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {displayValues.map((value: WorkflowValueLike, index: number) => {
            const key = value.field?.key || value.fieldKey || "";
            const label = getWorkflowFieldLabel(value, index);
            const displayValue = formatWorkflowDisplayValue(
              value,
              workflowValues,
            );

            return (
              <CaseValueRenderer
                key={value.id || key}
                label={label}
                value={displayValue}
              />
            );
          })}

          {displayValues.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-400 md:col-span-2">
              لا توجد بيانات محفوظة.
            </div>
          ) : null}
        </div>
      </section>

      {evidenceItems.length > 0 ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-black text-violet-600">
              الشواهد والمرفقات
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              شواهد الحالة
            </h2>
          </div>

          <div className="mt-5">
            <EvidencePreviewGrid items={evidenceItems} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper?: string | null;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-sky-700">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black text-slate-400">{label}</p>
          <p className="mt-1 text-sm font-black leading-6 text-slate-950">
            {value || "غير محدد"}
          </p>
          {helper ? (
            <p className="mt-1 text-xs font-bold text-slate-500">{helper}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptySimpleBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-400 md:col-span-2">
      {text}
    </div>
  );
}
