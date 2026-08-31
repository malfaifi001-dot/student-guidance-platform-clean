"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  FileText,
  ImageIcon,
  Link2,
  Loader2,
  MessageCircle,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { SignatureImage } from "@/components/signatures/signature-image";
import { openExternalUrl } from "@/lib/native/external-url-handler";
import { buildWhatsAppShareLink } from "@/lib/whatsapp/whatsapp-links";

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

type LinkSummary = {
  id: string;
  title: string;
  note: string | null;
  status: string;
  token: string;
  publicUrl: string;
  tokenExpiresAt: string | Date | null;
  closedAt: string | Date | null;
  submissionCounts: {
    total: number;
    submitted: number;
    returned: number;
    approved: number;
    canceled: number;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Submission = {
  id: string;
  linkId: string;
  linkTitle: string;
  domainSlug: string;
  domainTitle: string;
  teacherName: string;
  teacherPhone: string;
  teacherEmail: string | null;
  teacherSignatureUrl: string | null;
  teacherSignedName: string | null;
  teacherSignedAt: string | Date | null;
  status: string;
  returnedReason: string | null;
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
  initialLinks: LinkSummary[];
  initialSubmissions: Submission[];
};

const LINK_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "مفتوح",
  CLOSED: "مغلق",
  EXPIRED: "منتهي",
};

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "بانتظار الاعتماد",
  RETURNED: "مرجع للتعديل",
  APPROVED: "معتمد",
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
  if (value === null || value === undefined || value === "") return [];

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

  if (!tokens.length || !field.options.length) return "";

  for (const token of tokens) {
    const cleanToken = String(token).trim();

    const option = field.options.find((item) => {
      return String(item.value || "").trim() === cleanToken || String(item.label || "").trim() === cleanToken;
    });

    if (option?.label) return option.label;
  }

  return "";
}

function isActivityDomainField(field: RuntimeField) {
  const text = normalizeLookupText(`${field.key} ${field.label}`);

  return text.includes("activity domain") || text.includes("domain") || text.includes("مجال النشاط") || text.includes("المجال");
}

function formatRawValue(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join("، ");
  if (value === null || value === undefined || value === "") return "غير مدخل";

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.label) return String(record.label);
    if (record.name) return String(record.name);
    if (record.value) return String(record.value);
    return JSON.stringify(value);
  }

  return String(value);
}

function formatFieldValue(submission: Submission, field: RuntimeField, value: unknown) {
  if (isActivityDomainField(field)) return submission.domainTitle;

  if (Array.isArray(value)) {
    const items = value
      .map((item) => findOptionLabel(field, item) || formatRawValue(item))
      .filter((item) => item && item !== "غير مدخل");

    return items.length ? items.join("، ") : "غير مدخل";
  }

  return findOptionLabel(field, value) || formatRawValue(value);
}

function getOrderedFields(submission: Submission) {
  return [...submission.workflow.steps]
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

function getDisplayTitle(submission: Submission) {
  const fields = getOrderedFields(submission);

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
    const candidate = formatFieldValue(submission, field, submission.submittedValues?.[field.key]);

    if (candidate && candidate !== "غير مدخل") return candidate;
  }

  return `${submission.domainTitle} - ${submission.teacherName}`;
}

export function TeacherActivityLinksClient({ initialLinks, initialSubmissions }: Props) {
  const [links, setLinks] = useState<LinkSummary[]>(initialLinks);
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<{
    id: string;
    publicUrl: string;
    shareMessage: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "return" | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
  const [returnReason, setReturnReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"links" | "submissions">("links");

  const stats = useMemo(() => {
    return {
      links: links.length,
      openLinks: links.filter((item) => item.status === "ACTIVE").length,
      waiting: submissions.filter((item) => item.status === "SUBMITTED").length,
      approved: submissions.filter((item) => item.status === "APPROVED").length,
    };
  }, [links, submissions]);

  async function refresh() {
    setLoading(true);

    try {
      const response = await fetch("/api/dashboard/activity-leader/activity-teacher-links/overview", {
        cache: "no-store",
      });
      const result = await response.json();

      if (result.success) {
        setLinks(result.links);
        setSubmissions(result.submissions);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      refresh();
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  function resetCreateForm() {
    setTitle("");
    setNote("");
    setDueDate("");
    setCreatedLink(null);
    setCopied(false);
  }

  async function handleCreateLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setFeedback("");
    setCreatedLink(null);

    try {
      const response = await fetch("/api/dashboard/activity-leader/activity-teacher-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, note, dueDate }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر إنشاء الرابط.");
      }

      setCreatedLink({
        id: result.link.id,
        publicUrl: result.link.publicUrl,
        shareMessage: result.link.shareMessage,
      });
      setTitle("");
      setNote("");
      setDueDate("");
      setCopied(false);
      await refresh();
    } catch (createError) {
      setFeedback(
        createError instanceof Error ? createError.message : "تعذر إنشاء الرابط.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyText(text: string) {
    const value = String(text || "").trim();

    if (!value) {
      setFeedback("تعذر نسخ النص.");
      return;
    }

    let copiedSuccessfully = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        copiedSuccessfully = true;
      }
    } catch {
      copiedSuccessfully = false;
    }

    if (!copiedSuccessfully) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        textarea.style.left = "-9999px";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, value.length);
        copiedSuccessfully = document.execCommand("copy");
        textarea.remove();
      } catch {
        copiedSuccessfully = false;
      }
    }

    if (!copiedSuccessfully) {
      setFeedback("تعذر نسخ النص.");
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function openWhatsApp(message: string) {
    const url = buildWhatsAppShareLink(message);

    if (!url) {
      setFeedback("تعذر تجهيز رسالة واتساب.");
      return;
    }

    void openExternalUrl(url).catch(() => {
      setFeedback("تعذر فتح واتساب.");
    });
  }

  async function linkAction(linkId: string, action: "CLOSE" | "REACTIVATE") {
    setFeedback("");

    try {
      const response = await fetch(
        `/api/dashboard/activity-leader/activity-teacher-links/${linkId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر تنفيذ الإجراء.");
      }

      setFeedback(result.message || "تم تنفيذ الإجراء.");
      await refresh();
    } catch (actionError) {
      setFeedback(
        actionError instanceof Error ? actionError.message : "تعذر تنفيذ الإجراء.",
      );
    }
  }

  async function deleteLink(linkId: string) {
    setFeedback("");

    try {
      const response = await fetch(
        `/api/dashboard/activity-leader/activity-teacher-links/${linkId}`,
        { method: "DELETE" },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر حذف الرابط.");
      }

      setFeedback(result.message || "تم حذف الرابط.");
      setLinks((current) => current.filter((item) => item.id !== linkId));
      setSubmissions((current) => current.filter((item) => item.linkId !== linkId));
    } catch (actionError) {
      setFeedback(
        actionError instanceof Error ? actionError.message : "تعذر حذف الرابط.",
      );
    }
  }

  function openModal(submission: Submission, mode: "view" | "edit" | "return") {
    setSelected(submission);
    setModalMode(mode);
    setDraftValues(submission.submittedValues || {});
    setReturnReason(submission.returnedReason || "");
    setFeedback("");
  }

  function closeModal() {
    setSelected(null);
    setModalMode(null);
    setDraftValues({});
    setReturnReason("");
    setSaving(false);
  }

  async function reviewSubmission(
    submissionId: string,
    action: "APPROVE" | "RETURN" | "UPDATE_SUBMISSION" | "CANCEL",
    payload?: Record<string, unknown>,
  ) {
    setSaving(true);
    setFeedback("");

    try {
      const response = await fetch(
        `/api/dashboard/activity-leader/activity-teacher-links/submissions/${submissionId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setFeedback(result.error || "تعذر تنفيذ الإجراء.");
        return;
      }

      setFeedback(result.message || "تم تنفيذ الإجراء بنجاح.");
      if (action === "CANCEL") {
        setSubmissions((current) => current.filter((item) => item.id !== submissionId));
      }
      closeModal();
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-4" dir="rtl">
      <section className="rounded-2xl bg-gradient-to-l from-sky-800 via-cyan-700 to-sky-600 px-4 py-3 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black leading-8">إرسال أنشطة للمعلمين</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setCreateOpen(true); resetCreateForm(); setFeedback(""); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-black text-sky-900 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Plus className="h-4 w-4" />رابط جديد</button>
            <button type="button" onClick={refresh} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-3.5 py-2 text-sm font-black text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><RefreshCw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />تحديث</button>
          </div>
        </div>
      </section>

      {feedback ? <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-sm font-black text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">{feedback}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-black text-slate-500 dark:text-slate-400">
            <span className="text-sky-700 dark:text-sky-300">{stats.openLinks} رابط مفتوح</span>
            <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
            <span className="text-amber-700 dark:text-amber-300">{stats.waiting} بانتظار الاعتماد</span>
            <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
            <span className="text-emerald-700 dark:text-emerald-300">{stats.approved} معتمد</span>
          </p>
          <div className="flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950" role="tablist" aria-label="قسم أنشطة المعلمين">
            <button type="button" role="tab" aria-selected={activeSection === "links"} onClick={() => setActiveSection("links")} className={`min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-black transition ${activeSection === "links" ? "bg-white text-sky-700 shadow-sm dark:bg-slate-800 dark:text-sky-300" : "text-slate-500 hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300"}`}>الروابط المفتوحة</button>
            <button type="button" role="tab" aria-selected={activeSection === "submissions"} onClick={() => setActiveSection("submissions")} className={`min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-black transition ${activeSection === "submissions" ? "bg-white text-sky-700 shadow-sm dark:bg-slate-800 dark:text-sky-300" : "text-slate-500 hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300"}`}>الأنشطة المرسلة</button>
          </div>
        </div>

        {activeSection === "links" ? <section aria-labelledby="activity-links-heading" className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <h2 id="activity-links-heading" className="sr-only">الروابط المفتوحة</h2>
          <div className="space-y-2.5">
            {links.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center dark:border-slate-700 dark:bg-slate-950"><p className="font-black text-slate-800 dark:text-slate-100">لا توجد روابط بعد</p><p className="mt-1 text-xs font-bold text-slate-500">أنشئ رابطًا جديدًا لمشاركته مع المعلمين.</p></div> : null}
            {links.map((link) => <article key={link.id} className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-sky-200 hover:shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:hover:border-sky-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">{LINK_STATUS_LABELS[link.status] || link.status}</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{link.submissionCounts.total} إرسال</span>
                  </div>
                  <h3 className="mt-1.5 flex items-center gap-1.5 truncate font-black text-slate-950 dark:text-white"><Link2 className="h-4 w-4 shrink-0 text-sky-600" />{link.title}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{link.submissionCounts.approved} معتمد · {link.submissionCounts.submitted} بانتظار الاعتماد · {link.submissionCounts.returned} مرجع</p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400"><CalendarDays className="h-3.5 w-3.5" />ينتهي: {formatDate(link.tokenExpiresAt)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <LinkActionButton title="نسخ الرابط" onClick={() => copyText(link.publicUrl)}><Copy className="h-4 w-4" /></LinkActionButton>
                  <LinkActionButton title="مشاركة عبر واتساب" onClick={() => openWhatsApp(`السلام عليكم،\n\nيمكنكم إرسال أنشطتكم عبر الرابط التالي (${link.title}):\n${link.publicUrl}`)}><MessageCircle className="h-4 w-4 text-emerald-600" /></LinkActionButton>
                  {link.status === "ACTIVE" ? <LinkActionButton title="إغلاق الرابط" onClick={() => linkAction(link.id, "CLOSE")} className="bg-amber-50 text-amber-800 ring-amber-100 hover:bg-amber-100"><RotateCcw className="h-4 w-4" /></LinkActionButton> : <LinkActionButton title="إعادة فتح الرابط" onClick={() => linkAction(link.id, "REACTIVATE")} className="bg-emerald-50 text-emerald-800 ring-emerald-100 hover:bg-emerald-100"><RefreshCw className="h-4 w-4" /></LinkActionButton>}
                  <LinkActionButton title="حذف الرابط" onClick={() => deleteLink(link.id)} className="bg-red-50 text-red-700 ring-red-100 hover:bg-red-100"><Trash2 className="h-4 w-4" /></LinkActionButton>
                </div>
              </div>
              <div className="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300" dir="ltr">{link.publicUrl}</div>
            </article>)}
          </div>
        </section> : <section aria-labelledby="activity-submissions-heading" className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <h2 id="activity-submissions-heading" className="sr-only">الأنشطة المرسلة</h2>
          <div className="space-y-2.5">
            {submissions.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center dark:border-slate-700 dark:bg-slate-950"><p className="font-black text-slate-800 dark:text-slate-100">لا توجد أنشطة مرسلة بعد</p><p className="mt-1 text-xs font-bold text-slate-500">عندما يرسل المعلمون عبر الرابط سترى أنشطتهم هنا.</p></div> : null}
            {submissions.map((submission) => {
              const canReview = submission.status === "SUBMITTED" && !submission.caseEntryId;
              const canEdit = (submission.status === "SUBMITTED" || submission.status === "RETURNED") && !submission.caseEntryId;
              const hasSubmission = Object.keys(submission.submittedValues || {}).length > 0;
              const displayTitle = getDisplayTitle(submission);
              return <article key={submission.id} className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-sky-200 hover:shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:hover:border-sky-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SubmissionStatusBadge status={submission.status} />
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">{submission.domainTitle}</span>
                      {submission.submittedEvidenceItems.length > 0 ? <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 dark:text-violet-300"><ImageIcon className="h-3.5 w-3.5" />{new Intl.NumberFormat("ar-SA").format(submission.submittedEvidenceItems.length)} شواهد</span> : null}
                    </div>
                    <h3 className="mt-1.5 truncate text-base font-black leading-6 text-slate-950 dark:text-white">{displayTitle}</h3>
                    <p className="mt-0.5 text-xs font-black text-sky-700 dark:text-sky-300">المعلم: {submission.teacherName}</p>
                    {submission.returnedReason ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-black leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">سبب الإرجاع: {submission.returnedReason}</p> : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {hasSubmission ? <ActionButton title="عرض النشاط" onClick={() => openModal(submission, "view")}><Eye className="h-4 w-4" /></ActionButton> : null}
                    {canEdit && hasSubmission ? <ActionButton title="تعديل النشاط" onClick={() => openModal(submission, "edit")}><PencilLine className="h-4 w-4" /></ActionButton> : null}
                    {canEdit ? <ActionButton title="إرجاع للمعلم" onClick={() => openModal(submission, "return")} className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"><RotateCcw className="h-4 w-4" /></ActionButton> : null}
                    {canReview ? <ActionButton title="اعتماد النشاط" onClick={() => reviewSubmission(submission.id, "APPROVE")} className="border-transparent bg-emerald-700 text-white hover:bg-emerald-800"><CheckCircle2 className="h-4 w-4" /></ActionButton> : null}
                    {!submission.caseEntryId && submission.status !== "APPROVED" ? <ActionButton title="إلغاء النشاط" onClick={() => reviewSubmission(submission.id, "CANCEL")} className="border-red-100 bg-red-50 text-red-700 hover:bg-red-100"><Trash2 className="h-4 w-4" /></ActionButton> : null}
                    {submission.caseEntryId ? <Link href={`/dashboard/cases/${submission.caseEntryId}`} aria-label="فتح الحالة" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-700 text-white transition hover:bg-sky-800" title="فتح الحالة"><FileText className="h-4 w-4" /></Link> : null}
                  </div>
                </div>
              </article>;
            })}
          </div>
        </section>}
      </section>

      {createOpen ? (
        <CreateLinkModal
          title={title}
          setTitle={setTitle}
          note={note}
          setNote={setNote}
          dueDate={dueDate}
          setDueDate={setDueDate}
          creating={creating}
           createdLink={createdLink}
           copied={copied}
           onCopy={copyText}
           onShare={openWhatsApp}
           onClose={() => {
            setCreateOpen(false);
            resetCreateForm();
          }}
          onSubmit={handleCreateLink}
        />
      ) : null}

      {selected && modalMode ? (
        <ReviewModal
          submission={selected}
          mode={modalMode}
          draftValues={draftValues}
          setDraftValues={setDraftValues}
          returnReason={returnReason}
          setReturnReason={setReturnReason}
          saving={saving}
          onClose={closeModal}
          onApprove={() => reviewSubmission(selected.id, "APPROVE")}
          onReturn={() =>
            reviewSubmission(selected.id, "RETURN", { reason: returnReason })
          }
          onSaveEdit={() =>
            reviewSubmission(selected.id, "UPDATE_SUBMISSION", {
              values: draftValues,
              evidenceItems: selected.submittedEvidenceItems,
            })
          }
        />
      ) : null}
    </main>
  );
}

function CreateLinkModal({
  title,
  setTitle,
  note,
  setNote,
  dueDate,
  setDueDate,
  creating,
  createdLink,
  copied,
  onCopy,
  onShare,
  onClose,
  onSubmit,
}: {
  title: string;
  setTitle: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  creating: boolean;
  createdLink: { id: string; publicUrl: string; shareMessage: string } | null;
  copied: boolean;
  onCopy: (text: string) => void;
  onShare: (message: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/20"
        dir="rtl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-2xl font-black text-slate-950">رابط نشاط مفتوح</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              أدخل بيانات الرابط ثم شاركه مع المعلمين.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {createdLink ? (
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm font-black text-emerald-800">
                  تم إنشاء الرابط بنجاح. شاركه مع المعلمين.
                </p>

                <div className="mt-3 break-all rounded-2xl bg-white px-4 py-3 text-left text-xs font-bold text-slate-600" dir="ltr">
                  {createdLink.publicUrl}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onCopy(createdLink.publicUrl)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "تم النسخ" : "نسخ الرابط"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onShare(createdLink.shareMessage)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    مشاركة عبر واتساب
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                إغلاق
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <Field label="عنوان الرابط">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  className="input"
                  placeholder="مثال: أنشطة شهر ربيع الثاني"
                />
              </Field>

              <Field label="تاريخ الانتهاء (اختياري)">
                <input
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  type="date"
                  className="input"
                />
              </Field>

              <Field label="ملاحظة للمعلمين (اختياري)">
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="input min-h-24 resize-none"
                  placeholder="مثال: فضلاً رفع صورة واحدة على الأقل من تنفيذ النشاط."
                />
              </Field>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  إنشاء الرابط
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}
        </div>

        <style jsx>{`
          .input { width: 100%; border-radius: 1rem; border: 1px solid rgb(226 232 240); background: white; color: rgb(51 65 85); padding: 0.75rem 1rem; font-size: 0.875rem; font-weight: 700; outline: none; transition: 150ms; }
          .input:focus { border-color: rgb(125 211 252); box-shadow: 0 0 0 4px rgb(240 249 255); }
        `}</style>
      </section>
    </div>
  );
}

function ReviewModal({
  submission,
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
  submission: Submission;
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
  const fields = getOrderedFields(submission);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl" dir="rtl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-black text-sky-700">
              {submission.domainTitle} · {submission.linkTitle}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {mode === "view"
                ? "عرض نشاط المعلم"
                : mode === "edit"
                  ? "تعديل نشاط المعلم"
                  : "إرجاع النشاط للتعديل"}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              المعلم: {submission.teacherName}
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
                <div key={field.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-black text-slate-400">{field.label}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-7 text-slate-800">
                    {formatFieldValue(submission, field, submission.submittedValues[field.key])}
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

              {submission.teacherSignatureUrl ? (
                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <SignatureImage
                    src={submission.teacherSignatureUrl}
                    alt={`توقيع ${submission.teacherSignedName || submission.teacherName}`}
                    className="h-24"
                  />

                  <p className="mt-3 text-xs font-black text-slate-500">
                    الاسم: {submission.teacherSignedName || submission.teacherName}
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

              {submission.submittedEvidenceItems.length ? (
                <div className="mt-3 grid gap-2">
                  {submission.submittedEvidenceItems.map((item) => (
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
                <p className="mt-2 text-sm font-bold text-slate-500">لا توجد شواهد مرفوعة.</p>
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

          {mode === "view" && submission.status === "SUBMITTED" && !submission.caseEntryId ? (
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

function SubmissionStatusBadge({ status }: { status: string }) {
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
            : status === "CANCELED"
              ? "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
              : "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
      ].join(" ")}
    >
      {isGood ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
      {SUBMISSION_STATUS_LABELS[status] || status}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function LinkActionButton({
  title,
  onClick,
  children,
  className,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-xl border p-0 text-xs font-black transition",
        className || "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ActionButton({
  title,
  onClick,
  children,
  className,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition",
        className || "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
