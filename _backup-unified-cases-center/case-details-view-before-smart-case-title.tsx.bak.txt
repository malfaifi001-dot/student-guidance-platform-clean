import { CaseValueRenderer } from "@/components/cases/case-value-renderer";
import { EvidencePreviewGrid } from "@/components/evidence/evidence-preview-grid";
import {
  formatWorkflowDisplayValue,
  getWorkflowFieldLabel,
  type WorkflowFieldLike,
  type WorkflowValueLike,
} from "@/lib/workflow-values/workflow-display-value";

type CaseDetailsViewProps = {
  caseEntry: any;
};

type FieldLookupItem = WorkflowFieldLike & {
  key?: string | null;
  label?: string | null;
};

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

function shouldHideCaseValue(fieldKey: string) {
  return [
    "student",
    "guardian",
    "metadata",
    "selectedStudent",
  ].includes(fieldKey) || fieldKey.endsWith("__other");
}

function normalizeCaseValue(
  value: any,
  fieldMap: Map<string, FieldLookupItem>
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

function formatCommitteeRows(value: unknown) {
  if (!Array.isArray(value)) return value;

  return value.map((row) => {
    if (!row || typeof row !== "object") return row;

    const item = row as Record<string, unknown>;

    return {
      "جدول الأعمال": item.agendaOther || item.agenda || "—",
      "محور النقاش": item.discussionOther || item.discussion || "—",
      "التوصية": item.recommendationOther || item.recommendation || "—",
    };
  });
}

export function CaseDetailsView({ caseEntry }: CaseDetailsViewProps) {
  const fieldMap = buildFieldMap(caseEntry);

  const workflowValues: WorkflowValueLike[] = caseEntry.values.map((value: any) =>
    normalizeCaseValue(value, fieldMap)
  );

  const displayValues = caseEntry.values
    .map((value: any) => normalizeCaseValue(value, fieldMap))
    .filter((value: WorkflowValueLike) => {
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

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold text-sky-100">Case Viewer</p>

        <h1 className="mt-3 text-4xl font-black">
          {caseEntry.title || "تفاصيل الحالة"}
        </h1>

        <p className="mt-4 max-w-3xl leading-8 text-sky-50">
          عرض موحد ومنظم للحالات المحفوظة من جميع الخدمات.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">الخدمة</p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {caseEntry.service?.name || "—"}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">الطالب/الطالبة</p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {caseEntry.student?.fullName || "غير مرتبط بطالب"}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">الحالة</p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {caseEntry.status}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">التاريخ</p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {new Date(caseEntry.createdAt).toLocaleDateString("ar-SA")}
          </p>
        </div>
      </section>

      {caseEntry.student ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">
            بيانات الطالب/الطالبة
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <CaseValueRenderer label="الاسم" value={caseEntry.student.fullName} />
            <CaseValueRenderer label="المرحلة" value={caseEntry.student.stage} />
            <CaseValueRenderer label="الصف" value={caseEntry.student.grade} />
            <CaseValueRenderer label="الفصل" value={caseEntry.student.classroom} />
            <CaseValueRenderer
              label="ولي الأمر"
              value={caseEntry.student.guardian?.name}
            />
            <CaseValueRenderer
              label="رقم الجوال"
              value={caseEntry.student.guardian?.phone}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">بيانات الحالة</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {displayValues.map((value: WorkflowValueLike, index: number) => {
            const key = value.field?.key || value.fieldKey || "";
            const label = getWorkflowFieldLabel(value, index);

            const displayValue =
              key === "committee_items"
                ? formatCommitteeRows(value.jsonValue ?? value.value)
                : formatWorkflowDisplayValue(value, workflowValues);

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
              لا توجد قيم محفوظة لهذه الحالة.
            </div>
          ) : null}
        </div>
      </section>

      {evidenceItems.length > 0 ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">
            الشواهد والمرفقات
          </h2>

          <div className="mt-6">
            <EvidencePreviewGrid items={evidenceItems} />
          </div>
        </section>
      ) : null}
    </div>
  );
}