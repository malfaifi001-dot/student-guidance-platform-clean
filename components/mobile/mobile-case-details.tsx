import Link from "next/link";

import { MobileAppShell } from "@/components/mobile/mobile-app-shell";
import { MobileIcon, type MobileIconName } from "@/components/mobile/mobile-icons";
import {
  formatWorkflowDisplayValue,
  getWorkflowFieldLabel,
  type WorkflowFieldLike,
  type WorkflowValueLike,
} from "@/lib/workflow-values/workflow-display-value";

type DetailStat = {
  label: string;
  value: number;
};

type FieldLookupItem = WorkflowFieldLike & {
  key?: string | null;
  label?: string | null;
};

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

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text || text === "null" || text === "undefined") {
    return "";
  }

  return text;
}

function getCaseStatusLabel(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "SUBMITTED") return "مكتملة";
  if (status === "ARCHIVED") return "مؤرشفة";
  return status || "غير محدد";
}

function getStatusClasses(status: string) {
  if (status === "DRAFT") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  }

  if (status === "SUBMITTED") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function getCaseTitle(caseEntry: any) {
  return (
    cleanText(caseEntry?.title) ||
    cleanText(caseEntry?.student?.fullName) ||
    cleanText(caseEntry?.service?.name) ||
    "تفاصيل الحالة"
  );
}

function getStudentMeta(student: any) {
  return [
    cleanText(student?.stage),
    cleanText(student?.grade),
    cleanText(student?.classroom) ? `فصل ${student.classroom}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function getValues(caseEntry: any) {
  return Array.isArray(caseEntry?.values) ? caseEntry.values : [];
}

function getEvidences(caseEntry: any) {
  if (Array.isArray(caseEntry?.evidences)) return caseEntry.evidences;
  if (Array.isArray(caseEntry?.caseEvidences)) return caseEntry.caseEvidences;
  return [];
}

function getReports(caseEntry: any) {
  return Array.isArray(caseEntry?.guidanceReports) ? caseEntry.guidanceReports : [];
}

function buildFieldMap(caseEntry: any) {
  const map = new Map<string, FieldLookupItem>();

  const addFields = (steps: any[] | undefined) => steps?.forEach((step: any) => {
    step.fields?.forEach((field: any) => {
      if (!field?.key) return;

      map.set(field.key, {
        key: field.key,
        label: field.label,
        type: field.type,
        options: Array.isArray(field.options) ? field.options : [],
      });
    });
  });

  const snapshot = caseEntry.workflowSnapshot as
    | { steps?: any[]; workflow?: { steps?: any[] } }
    | null
    | undefined;

  addFields(snapshot?.steps || snapshot?.workflow?.steps);
  caseEntry.workflow?.steps?.forEach((step: any) => {
    step.fields?.forEach((field: any) => {
      if (!field?.key || map.has(field.key)) return;

      map.set(field.key, {
        key: field.key,
        label: field.label,
        type: field.type,
        options: Array.isArray(field.options) ? field.options : [],
      });
    });
  });

  return map;
}

function normalizeWorkflowValue(
  value: any,
  fieldMap: Map<string, FieldLookupItem>,
): WorkflowValueLike {
  const fieldKey = value.field?.key || value.fieldKey || "";
  const fieldFromWorkflow = fieldMap.get(fieldKey);

  const valueFieldOptions =
    Array.isArray(value.field?.options) && value.field.options.length
      ? value.field.options
      : [];

  return {
    id: value.id,
    fieldKey,
    value: value.value,
    jsonValue: value.jsonValue,
    field: {
      key: fieldKey,
      label:
      fieldFromWorkflow?.label ||
        value.field?.label ||
        value.field?.key ||
        value.fieldKey ||
        "بيان",
      type: fieldFromWorkflow?.type || value.field?.type || null,
      options: fieldFromWorkflow?.options?.length
        ? fieldFromWorkflow.options
        : valueFieldOptions,
    },
  };
}

function shouldShowWorkflowValue(
  value: WorkflowValueLike,
  fieldMap: Map<string, FieldLookupItem>,
) {
  const key = cleanText(value.field?.key || value.fieldKey);

  if (!key) return false;

  if (fieldMap.has(key)) {
    return true;
  }

  const normalizedKey = key.toLowerCase();

  return (
    !normalizedKey.includes("token") &&
    !normalizedKey.includes("signature_url") &&
    !normalizedKey.endsWith("__other")
  );
}

function formatDisplayValue(value: WorkflowValueLike, allValues: WorkflowValueLike[]) {
  const displayValue = formatWorkflowDisplayValue(value, allValues);

  if (displayValue === null || displayValue === undefined || displayValue === "") {
    return "غير محدد";
  }

  return String(displayValue);
}

function IconBox({ icon, dark = false }: { icon: MobileIconName; dark?: boolean }) {
  return (
    <span
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1",
        dark
          ? "bg-white/75 text-sky-700 ring-sky-100"
          : "bg-slate-100/80 text-slate-500 ring-white/80",
      ].join(" ")}
    >
      <MobileIcon name={icon} className="h-5 w-5" />
    </span>
  );
}

function DetailStats({ stats }: { stats: DetailStat[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl bg-white/75 p-2.5 text-center ring-1 ring-sky-100"
        >
          <p className="text-xl font-black">{stat.value}</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

function InfoRow({
  icon,
  title,
  value,
}: {
  icon: MobileIconName;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[1.35rem] bg-white/80 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl">
      <IconBox icon={icon} />
      <div className="min-w-0">
        <p className="text-[11px] font-black text-slate-400">{title}</p>
        <p className="mt-0.5 truncate text-sm font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>;
}

function QuickActions({
  caseId,
  status,
  reportTwoSnapshotId,
}: {
  caseId: string;
  status: string;
  reportTwoSnapshotId?: string | null;
}) {
  const encodedCaseId = encodeURIComponent(caseId);

  return (
    <section className="grid grid-cols-2 gap-2.5">
      {status === "DRAFT" ? (
        <Link
          href={`/dashboard/cases/${encodedCaseId}/edit`}
          className="flex h-12 items-center justify-center gap-2 rounded-[1.35rem] bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-200"
        >
          <MobileIcon name="file" className="h-5 w-5" />
          استكمال
        </Link>
      ) : (
        <Link
          href={`/mobile/counselor/report-2/cases/${encodedCaseId}/prepare`}
          className="flex h-12 items-center justify-center gap-2 rounded-[1.35rem] bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-200"
        >
          <MobileIcon name="file" className="h-5 w-5" />
          إصدار تقرير
        </Link>
      )}

      {reportTwoSnapshotId ? (
        <Link
          href={`/dashboard/report-2/snapshots/${encodeURIComponent(reportTwoSnapshotId)}/preview`}
          className="flex h-12 items-center justify-center gap-2 rounded-[1.35rem] bg-sky-50 text-sm font-black text-sky-700 ring-1 ring-sky-100"
        >
          <MobileIcon name="shield" className="h-5 w-5" />
          تقرير معتمد
        </Link>
      ) : (
        <Link
          href={`/dashboard/cases/${encodedCaseId}`}
          className="flex h-12 items-center justify-center gap-2 rounded-[1.35rem] bg-sky-50 text-sm font-black text-sky-700 ring-1 ring-sky-100"
        >
          <MobileIcon name="camera" className="h-5 w-5" />
          الشواهد
        </Link>
      )}
    </section>
  );
}

export function MobileCaseDetails({
  caseEntry,
  reportTwoSnapshotId,
}: {
  caseEntry: any;
  reportTwoSnapshotId?: string | null;
}) {
  const rawValues = getValues(caseEntry);
  const evidences = getEvidences(caseEntry);
  const reports = getReports(caseEntry);

  const fieldMap = buildFieldMap(caseEntry);
  const workflowValues: WorkflowValueLike[] = rawValues.map((value: any) =>
    normalizeWorkflowValue(value, fieldMap),
  );

  const visibleValues = workflowValues
    .filter((value: WorkflowValueLike) => shouldShowWorkflowValue(value, fieldMap))
    .slice(0, 10);

  const title = getCaseTitle(caseEntry);
  const statusLabel = getCaseStatusLabel(caseEntry.status);
  const studentMeta = getStudentMeta(caseEntry.student);

  const stats: DetailStat[] = [
    { label: "حقول", value: rawValues.length },
    { label: "شواهد", value: evidences.length },
    { label: "تقارير", value: reports.length },
  ];

  return (
    <MobileAppShell activeSection="cases">
      <div className="space-y-4">
        <section className="mobile-hero-card-dark relative overflow-hidden rounded-[1.8rem] p-4">
          <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-sky-200/70 blur-2xl" />
          <div className="absolute -bottom-16 right-10 h-36 w-36 rounded-full bg-cyan-100/80 blur-2xl" />

          <div className="relative space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black text-sky-700">تفاصيل الحالة</p>
                <h1 className="mt-1 line-clamp-2 text-[1.55rem] font-black leading-tight tracking-tight">
                  {title}
                </h1>
              </div>

              <IconBox icon="check" dark />
            </div>

            <span
              className={[
                "inline-flex rounded-full px-3 py-1 text-xs font-black",
                getStatusClasses(caseEntry.status),
              ].join(" ")}
            >
              {statusLabel}
            </span>

            <DetailStats stats={stats} />
          </div>
        </section>

        <QuickActions
          caseId={caseEntry.id}
          status={caseEntry.status}
          reportTwoSnapshotId={reportTwoSnapshotId}
        />

        <section className="space-y-2.5">
          <SectionTitle title="البيانات الأساسية" />

          {caseEntry.student ? (
            <InfoRow
              icon="users"
              title="الطالب"
              value={cleanText(caseEntry.student.fullName)}
            />
          ) : null}

          <InfoRow
            icon="check"
            title="الخدمة"
            value={cleanText(caseEntry.service?.name) || "غير محدد"}
          />

          <InfoRow
            icon="calendar"
            title="آخر تحديث"
            value={formatDate(caseEntry.updatedAt)}
          />

          {studentMeta ? (
            <InfoRow icon="file" title="الصف" value={studentMeta} />
          ) : null}
        </section>

        {visibleValues.length ? (
          <section className="space-y-2.5">
            <SectionTitle title="بيانات الحالة" />

            {visibleValues.map((value: WorkflowValueLike, index: number) => {
              const label = getWorkflowFieldLabel(value, index);
              const displayValue = formatDisplayValue(value, workflowValues);

              return (
                <div
                  key={value.id || `${value.fieldKey}-${index}`}
                  className="rounded-[1.35rem] bg-white/80 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl"
                >
                  <p className="text-[11px] font-black text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black leading-6 text-slate-950">
                    {displayValue}
                  </p>
                </div>
              );
            })}
          </section>
        ) : null}

        <section className="space-y-2.5">
          <SectionTitle title="الملفات والتقارير" />

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href={`/dashboard/cases/${encodeURIComponent(caseEntry.id)}`}
              className="rounded-[1.35rem] bg-white/80 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl"
            >
              <IconBox icon="camera" />
              <p className="mt-3 text-sm font-black text-slate-950">الشواهد</p>
              <p className="mt-1 text-xs font-bold text-slate-400">{evidences.length}</p>
            </Link>

            <Link
              href={`/mobile/counselor/report-2/cases/${encodeURIComponent(caseEntry.id)}/prepare`}
              className="rounded-[1.35rem] bg-white/80 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl"
            >
              <IconBox icon="file" />
              <p className="mt-3 text-sm font-black text-slate-950">التقارير</p>
              <p className="mt-1 text-xs font-bold text-slate-400">{reports.length}</p>
            </Link>
          </div>
        </section>

        <Link
          href="/mobile/counselor/cases"
          className="flex h-11 items-center justify-center rounded-2xl bg-sky-50 text-sm font-black text-sky-700 ring-1 ring-sky-100"
        >
          الرجوع للحالات
        </Link>
      </div>
    </MobileAppShell>
  );
}
