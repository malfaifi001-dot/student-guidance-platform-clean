"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  FileText,
  ImageIcon,
  MessageCircle,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { SignatureImage } from "@/components/signatures/signature-image";

type FieldOption = {
  id: string;
  label: string;
  value: string;
  order: number;
};

type RuntimeField = {
  id: string;
  key: string;
  label: string;
  type: string;
  placeholder?: string | null;
  helpText?: string | null;
  isRequired: boolean;
  order: number;
  options: FieldOption[];
};

type RuntimeStep = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  fields: RuntimeField[];
};

type EvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
};

type Assignment = {
  id: string;
  domainSlug: string;
  domainTitle: string;
  teacherName: string;
  teacherPhone: string;
  teacherEmail: string | null;
  teacherSignatureUrl: string | null;
  teacherSignedName: string | null;
  teacherSignedAt: string | Date | null;
  dueDate: string | Date | null;
  note: string | null;
  returnedReason: string | null;
  status: string;
  token: string;
  publicUrl: string;
  whatsappUrl: string;
  openedAt: string | Date | null;
  submittedAt: string | Date | null;
  approvedAt: string | Date | null;
  returnedAt: string | Date | null;
  caseEntryId: string | null;
  caseEntry?: {
    id: string;
    title: string | null;
    status: string;
  } | null;
  submittedValues: Record<string, unknown>;
  submittedEvidenceItems: EvidenceItem[];
  workflow: {
    id: string;
    name: string;
    steps: RuntimeStep[];
  };
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Props = {
  initialAssignments: Assignment[];
};

const STATUS_LABELS: Record<string, string> = {
  SENT: "تم الإرسال",
  OPENED: "فتح الرابط",
  SUBMITTED: "بانتظار الاعتماد",
  APPROVED: "معتمد",
  RETURNED: "مرجع للتعديل",
  EXPIRED: "منتهي",
  CANCELED: "ملغي",
};

function formatDate(value: string | Date | null | undefined) {
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

function formatRawValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).join("، ");
  }

  if (value === null || value === undefined || value === "") {
    return "غير مدخل";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.label) return String(record.label);
    if (record.name) return String(record.name);
    if (record.value) return String(record.value);

    return JSON.stringify(value);
  }

  return String(value);
}

function normalizeLookupText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractValueTokens(value: unknown): string[] {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value).trim()].filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractValueTokens(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      ...extractValueTokens(record.value),
      ...extractValueTokens(record.id),
      ...extractValueTokens(record.key),
      ...extractValueTokens(record.slug),
      ...extractValueTokens(record.label),
      ...extractValueTokens(record.name),
    ];
  }

  return [];
}

function findOptionLabel(field: RuntimeField, value: unknown) {
  const tokens = extractValueTokens(value);

  if (!tokens.length || !field.options.length) {
    return "";
  }

  for (const token of tokens) {
    const cleanToken = String(token).trim();

    const option = field.options.find((item) => {
      return String(item.value || "").trim() === cleanToken || String(item.label || "").trim() === cleanToken;
    });

    if (option?.label) {
      return option.label;
    }
  }

  return "";
}

function isActivityDomainField(field: RuntimeField) {
  const text = normalizeLookupText(`${field.key} ${field.label}`);

  return text.includes("activity domain") || text.includes("domain") || text.includes("مجال النشاط") || text.includes("المجال");
}

function formatFieldValue(assignment: Assignment, field: RuntimeField, value: unknown) {
  if (isActivityDomainField(field)) {
    return assignment.domainTitle;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => findOptionLabel(field, item) || formatRawValue(item))
      .filter((item) => item && item !== "غير مدخل");

    return items.length ? items.join("، ") : "غير مدخل";
  }

  return findOptionLabel(field, value) || formatRawValue(value);
}

function getOrderedFields(assignment: Assignment) {
  return [...assignment.workflow.steps]
    .sort((a, b) => a.order - b.order)
    .flatMap((step) =>
      [...step.fields]
        .sort((a, b) => a.order - b.order)
        .map((field) => ({
          ...field,
          stepTitle: step.title,
        })),
    )
    .filter((field) => field.type !== "FILE_UPLOAD" && field.type !== "IMAGE_UPLOAD");
}

function getDisplayTitle(assignment: Assignment) {
  const fields = getOrderedFields(assignment);

  const titleFields = fields.filter((field) => {
    const text = normalizeLookupText(`${field.key} ${field.label}`);

    return (
      !isActivityDomainField(field) &&
      !text.includes("teacher") &&
      !text.includes("معلم") &&
      !text.includes("معلمه") &&
      (
        text.includes("program") ||
        text.includes("activity") ||
        text.includes("title") ||
        text.includes("name") ||
        text.includes("برنامج") ||
        text.includes("نشاط") ||
        text.includes("عنوان") ||
        text.includes("اسم")
      )
    );
  });

  for (const field of titleFields) {
    const candidate = formatFieldValue(assignment, field, assignment.submittedValues?.[field.key]);

    if (candidate && candidate !== "غير مدخل") {
      return candidate;
    }
  }

  return assignment.domainTitle;
}

export function TeacherAssignmentsClient({ initialAssignments }: Props) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "return" | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
  const [returnReason, setReturnReason] = useState("");
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    return {
      total: assignments.length,
      waitingTeacher: assignments.filter((item) =>
        ["SENT", "OPENED", "RETURNED"].includes(item.status),
      ).length,
      waitingApproval: assignments.filter((item) => item.status === "SUBMITTED").length,
      approved: assignments.filter((item) => item.status === "APPROVED").length,
    };
  }, [assignments]);

  async function refresh() {
    setLoading(true);

    try {
      const response = await fetch("/api/dashboard/activity-leader/teacher-assignments");
      const result = await response.json();

      if (result.success) {
        setAssignments(result.assignments);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setFeedback("تم نسخ الرابط.");
    window.setTimeout(() => setFeedback(""), 2200);
  }

  function openModal(assignment: Assignment, mode: "view" | "edit" | "return") {
    setSelected(assignment);
    setModalMode(mode);
    setDraftValues(assignment.submittedValues || {});
    setReturnReason(assignment.returnedReason || "");
    setFeedback("");
  }

  function closeModal() {
    setSelected(null);
    setModalMode(null);
    setDraftValues({});
    setReturnReason("");
    setSaving(false);
  }

  async function reviewAssignment(
    assignmentId: string,
    action: "APPROVE" | "RETURN" | "UPDATE_SUBMISSION",
    payload?: Record<string, unknown>,
  ) {
    setSaving(true);
    setFeedback("");

    try {
      const response = await fetch(
        `/api/dashboard/activity-leader/teacher-assignments/${assignmentId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            ...payload,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setFeedback(result.error || "تعذر تنفيذ الإجراء.");
        return;
      }

      setFeedback(result.message || "تم تنفيذ الإجراء بنجاح.");
      closeModal();
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      refresh();
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
              ريادة النشاط
            </span>

            <h1 className="mt-4 text-3xl font-black leading-10 text-slate-950">
              متابعة أنشطة المعلمين
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
              كل نشاط يرسله المعلم يظهر هنا للمراجعة. لا يتحول إلى حالة في مركز الأنشطة إلا بعد الاعتماد.
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />
            تحديث
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <StatCard label="كل التكليفات" value={stats.total} />
          <StatCard label="بانتظار المعلم" value={stats.waitingTeacher} />
          <StatCard label="بانتظار الاعتماد" value={stats.waitingApproval} />
          <StatCard label="معتمدة" value={stats.approved} />
        </div>
      </section>

      {feedback ? (
        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-black text-sky-800">
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {assignments.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="text-lg font-black text-slate-900">لا توجد تكليفات بعد</p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              افتح أحد مجالات برامج النشاط وأنشئ رابطًا للمعلم.
            </p>
          </div>
        ) : null}

        {assignments.map((assignment) => {
          const canReview = assignment.status === "SUBMITTED" && !assignment.caseEntryId;
          const canEdit = !assignment.caseEntryId && assignment.status !== "APPROVED";
          const hasSubmission = Object.keys(assignment.submittedValues || {}).length > 0;
          const displayTitle = getDisplayTitle(assignment);

          return (
            <article
              key={assignment.id}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:bg-white hover:shadow-md"
            >
              <div className="min-w-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={assignment.status} />

                    <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                      {assignment.domainTitle}
                    </span>

                    {assignment.teacherSignatureUrl ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        توقيع محفوظ
                      </span>
                    ) : null}

                    {assignment.submittedEvidenceItems.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                        <ImageIcon className="h-3.5 w-3.5" />
                        {new Intl.NumberFormat("ar-SA").format(assignment.submittedEvidenceItems.length)} شواهد
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 text-xl font-black leading-8 text-slate-950">
                    {displayTitle}
                  </h2>

                  <p className="mt-1 text-xs font-black text-sky-700">
                    اسم المعلم: {assignment.teacherName}
                  </p>

                  <p className="mt-1 text-xs font-bold text-slate-500" dir="ltr">
                    {assignment.teacherPhone}
                  </p>

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    آخر تحديث: {formatDate(assignment.updatedAt)}
                  </p>

                  {assignment.returnedReason ? (
                    <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black leading-6 text-amber-800 ring-1 ring-amber-100">
                      سبب الإرجاع: {assignment.returnedReason}
                    </p>
                  ) : null}

                  <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                    الإجراء التالي: {getNextActionText(assignment)}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap gap-2">
                  {hasSubmission ? (
                    <button
                      type="button"
                      onClick={() => openModal(assignment, "view")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      عرض
                    </button>
                  ) : (
                    <a
                      href={assignment.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      فتح الرابط
                    </a>
                  )}

                  {canReview ? (
                    <button
                      type="button"
                      onClick={() => openModal(assignment, "return")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-800 transition hover:bg-amber-100"
                    >
                      <RotateCcw className="h-4 w-4" />
                      إرجاع
                    </button>
                  ) : null}

                  {canEdit && hasSubmission ? (
                    <button
                      type="button"
                      onClick={() => openModal(assignment, "edit")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      <PencilLine className="h-4 w-4" />
                      تعديل
                    </button>
                  ) : null}

                  {canReview ? (
                    <button
                      type="button"
                      onClick={() => reviewAssignment(assignment.id, "APPROVE")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      اعتماد
                    </button>
                  ) : null}

                  {!assignment.caseEntryId && assignment.status !== "SUBMITTED" ? (
                    <>
                      <a
                        href={assignment.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700"
                      >
                        <MessageCircle className="h-4 w-4" />
                        واتساب
                      </a>

                      <button
                        type="button"
                        onClick={() => copy(assignment.publicUrl)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        <Copy className="h-4 w-4" />
                        نسخ
                      </button>
                    </>
                  ) : null}

                  {assignment.caseEntryId ? (
                    <Link
                      href={`/dashboard/cases/${assignment.caseEntryId}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-sky-800"
                    >
                      <FileText className="h-4 w-4" />
                      الحالة
                    </Link>
                  ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {selected && modalMode ? (
        <ReviewModal
          assignment={selected}
          mode={modalMode}
          draftValues={draftValues}
          setDraftValues={setDraftValues}
          returnReason={returnReason}
          setReturnReason={setReturnReason}
          saving={saving}
          onClose={closeModal}
          onApprove={() => reviewAssignment(selected.id, "APPROVE")}
          onReturn={() =>
            reviewAssignment(selected.id, "RETURN", {
              reason: returnReason,
            })
          }
          onSaveEdit={() =>
            reviewAssignment(selected.id, "UPDATE_SUBMISSION", {
              values: draftValues,
              evidenceItems: selected.submittedEvidenceItems,
            })
          }
        />
      ) : null}
    </main>
  );
}

function ReviewModal({
  assignment,
  mode,
  draftValues,
  setDraftValues,
  returnReason,
  setReturnReason,
  saving,
  onClose,
  onApprove,
  onReturn,
  onSaveEdit,
}: {
  assignment: Assignment;
  mode: "view" | "edit" | "return";
  draftValues: Record<string, unknown>;
  setDraftValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  returnReason: string;
  setReturnReason: (value: string) => void;
  saving: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReturn: () => void;
  onSaveEdit: () => void;
}) {
  const fields = getOrderedFields(assignment);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl" dir="rtl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-black text-sky-700">{assignment.domainTitle}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {mode === "view"
                ? "عرض نشاط المعلم"
                : mode === "edit"
                  ? "تعديل نشاط المعلم"
                  : "إرجاع النشاط للتعديل"}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              المعلم: {assignment.teacherName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[65vh] overflow-y-auto p-5">
          {mode === "return" ? (
            <div>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">
                  سبب الإرجاع للمعلم
                </span>
                <textarea
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-50"
                  placeholder="مثال: فضلاً إضافة شاهد واضح وكتابة عدد المستفيدين."
                />
              </label>
            </div>
          ) : null}

          {mode === "view" ? (
            <div className="grid gap-4">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <p className="text-xs font-black text-slate-400">{field.label}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-7 text-slate-800">
                    {formatFieldValue(assignment, field, assignment.submittedValues[field.key])}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {mode === "edit" ? (
            <div className="grid gap-4">
              {fields.map((field) => (
                <EditField
                  key={field.id}
                  field={field}
                  value={draftValues[field.key]}
                  onChange={(value) =>
                    setDraftValues((current) => ({
                      ...current,
                      [field.key]: value,
                    }))
                  }
                />
              ))}
            </div>
          ) : null}

          {mode !== "return" ? (
            <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-white p-4">
              <h3 className="text-lg font-black text-slate-950">توقيع المعلم المعتمد</h3>

              {assignment.teacherSignatureUrl ? (
                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <SignatureImage
                    src={assignment.teacherSignatureUrl}
                    alt={`توقيع ${assignment.teacherSignedName || assignment.teacherName}`}
                    className="h-24"
                  />

                  <p className="mt-3 text-xs font-black text-slate-500">
                    الاسم: {assignment.teacherSignedName || assignment.teacherName}
                  </p>
                </div>
              ) : (
                <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">
                  لم يتم حفظ توقيع للمعلم بعد.
                </p>
              )}
            </div>
          ) : null}

          {mode !== "return" ? (
            <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-white p-4">
              <h3 className="text-lg font-black text-slate-950">الشواهد</h3>

              {assignment.submittedEvidenceItems.length ? (
                <div className="mt-3 grid gap-2">
                  {assignment.submittedEvidenceItems.map((item) => (
                    <a
                      key={item.id || item.fileUrl}
                      href={item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-50"
                    >
                      {item.fileName}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm font-bold text-slate-500">
                  لا توجد شواهد مرفوعة.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-col gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            إغلاق
          </button>

          {mode === "edit" ? (
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              حفظ التعديل
            </button>
          ) : null}

          {mode === "return" ? (
            <button
              type="button"
              onClick={onReturn}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              إرجاع للمعلم
            </button>
          ) : null}

          {mode === "view" && assignment.status === "SUBMITTED" && !assignment.caseEntryId ? (
            <button
              type="button"
              onClick={onApprove}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              اعتماد وإنشاء حالة
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

function EditField({
  field,
  value,
  onChange,
}: {
  field: RuntimeField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "TEXTAREA" || field.type === "RICH_TEXT") {
    return (
      <label className="block">
        <FieldLabel field={field} />
        <textarea
          value={String(value || "")}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
        />
      </label>
    );
  }

  if (field.type === "SELECT" || field.type === "RADIO") {
    return (
      <label className="block">
        <FieldLabel field={field} />
        <select
          value={String(value || "")}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
        >
          <option value="">اختر...</option>
          {field.options.map((option) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "MULTI_SELECT" || field.type === "CHECKBOX") {
    const selected = Array.isArray(value) ? value.map(String) : [];

    return (
      <div>
        <FieldLabel field={field} />
        <div className="grid gap-2">
          {field.options.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value);

                  onChange(next);
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <label className="block">
      <FieldLabel field={field} />
      <input
        value={String(value || "")}
        onChange={(event) => onChange(event.target.value)}
        type={field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : "text"}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
      />
    </label>
  );
}

function FieldLabel({ field }: { field: RuntimeField }) {
  return (
    <span className="mb-2 block text-sm font-black text-slate-700">
      {field.label}
      {field.isRequired ? <span className="text-red-500"> *</span> : null}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">
        {new Intl.NumberFormat("ar-SA").format(value)}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isGood = status === "APPROVED";
  const isReview = status === "SUBMITTED";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black",
        isGood
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : isReview
            ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100"
            : "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
      ].join(" ")}
    >
      {isGood ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function getNextActionText(assignment: Assignment) {
  if (assignment.status === "SUBMITTED" && !assignment.caseEntryId) {
    return "مراجعة النشاط ثم اعتماد لإنشاء حالة في مركز الأنشطة.";
  }

  if (assignment.status === "APPROVED" || assignment.caseEntryId) {
    return "تم اعتماد النشاط ويمكن فتح الحالة.";
  }

  if (assignment.status === "RETURNED") {
    return "بانتظار تعديل المعلم وإعادة الإرسال.";
  }

  if (assignment.status === "OPENED") {
    return "المعلم فتح الرابط ولم يرسل النموذج بعد.";
  }

  if (assignment.status === "SENT") {
    return "بانتظار فتح المعلم للرابط.";
  }

  return "متابعة التكليف.";
}
