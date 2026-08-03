"use client";

import {
  Archive,
  Eye,
  FileText,
  FolderOpen,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { ReferenceLibraryConfirmDialog } from "@/components/reference-library/reference-library-confirm-dialog";
import type { ReferenceLibraryAdminItem } from "@/components/reference-library/admin-reference-library-types";

type FileVariant = "PDF" | "DOCX";

export function AdminReferenceItemCard({
  item,
  busy,
  onOpen,
  onEdit,
  onChangeStatus,
  onDelete,
  onReplaced,
}: {
  item: ReferenceLibraryAdminItem;
  busy: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onChangeStatus: (status: "DRAFT" | "PUBLISHED" | "ARCHIVED") => void;
  onDelete: () => void;
  onReplaced: (message: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceVariant, setReplaceVariant] = useState<FileVariant>("PDF");
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [replaceError, setReplaceError] = useState("");
  const [removeVariant, setRemoveVariant] = useState<FileVariant | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  const isFolder = item.itemType === "FOLDER";
  const hasPdf = Boolean(item.pdfFileName || item.pdfSizeBytes);
  const hasDocx = Boolean(item.docxFileName || item.docxSizeBytes);
  const canRemovePdf = hasPdf && hasDocx;
  const canRemoveDocx = hasPdf && hasDocx;

  const statusAppearance =
    item.status === "PUBLISHED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : item.status === "ARCHIVED"
        ? "border-slate-200 bg-slate-100 text-slate-600"
        : "border-amber-200 bg-amber-50 text-amber-700";

  const statusLabel =
    item.status === "PUBLISHED"
      ? "منشور"
      : item.status === "ARCHIVED"
        ? "مؤرشف"
        : "مسودة";

  function openReplaceDialog(variant: FileVariant) {
    setReplaceVariant(variant);
    setReplacementFile(null);
    setReplaceError("");
    setReplaceOpen(true);

    if (replaceInputRef.current) {
      replaceInputRef.current.value = "";
    }
  }

  function closeReplaceDialog() {
    if (replaceBusy) {
      return;
    }

    setReplaceOpen(false);
    setReplacementFile(null);
    setReplaceError("");
  }

  function selectReplacementFile(selectedFile: File | null) {
    setReplaceError("");

    if (!selectedFile) {
      setReplacementFile(null);
      return;
    }

    const lowerName = selectedFile.name.toLowerCase();
    const expectedExtension = replaceVariant === "PDF" ? ".pdf" : ".docx";

    if (!lowerName.endsWith(expectedExtension)) {
      setReplacementFile(null);
      setReplaceError(
        replaceVariant === "PDF"
          ? "اختر ملف PDF لاستبدال نسخة PDF."
          : "اختر ملف Word بصيغة DOCX لاستبدال نسخة Word.",
      );
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setReplacementFile(null);
      setReplaceError("حجم الملف يتجاوز الحد الأعلى وهو 50 ميجابايت.");
      return;
    }

    setReplacementFile(selectedFile);
  }

  async function replaceFile() {
    if (!replacementFile) {
      setReplaceError("اختر الملف البديل أولًا.");
      return;
    }

    setReplaceBusy(true);
    setReplaceError("");

    const formData = new FormData();
    formData.set("variant", replaceVariant);
    formData.set("file", replacementFile);

    try {
      const response = await fetch(
        `/api/dashboard/admin/counselor-reference-library/items/${encodeURIComponent(
          item.id,
        )}/replace-file`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "تعذر استبدال نسخة الملف.",
        );
      }

      setReplaceOpen(false);
      setReplacementFile(null);
      onReplaced(payload?.message || "تم استبدال نسخة الملف بنجاح.");
    } catch (error) {
      setReplaceError(
        error instanceof Error
          ? error.message
          : "تعذر استبدال نسخة الملف.",
      );
    } finally {
      setReplaceBusy(false);
    }
  }

  async function removeFileVariant() {
    if (!removeVariant) {
      return;
    }

    setReplaceBusy(true);

    try {
      const response = await fetch(
        `/api/dashboard/admin/counselor-reference-library/items/${encodeURIComponent(
          item.id,
        )}/file`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            variant: removeVariant,
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر حذف النسخة.");
      }

      setRemoveVariant(null);
      onReplaced(payload?.message || "تم حذف النسخة بنجاح.");
    } catch (error) {
      setReplaceError(
        error instanceof Error ? error.message : "تعذر حذف النسخة.",
      );
    } finally {
      setReplaceBusy(false);
    }
  }

  return (
    <>
      <article className="group relative overflow-visible rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.09)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              {isFolder ? (
                <FolderOpen className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700">
                  {isFolder ? (item.parentId ? "قسم" : "حقيبة") : "ملف"}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${statusAppearance}`}
                >
                  {statusLabel}
                </span>

                {!isFolder && hasPdf ? (
                  <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700">
                    PDF متاح
                  </span>
                ) : null}

                {!isFolder && hasDocx ? (
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                    Word متاح
                  </span>
                ) : null}

                {!isFolder && item.pdfCoverApplied ? (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black text-violet-700">
                    غلاف رسمي
                  </span>
                ) : null}
              </div>

              <h3 className="mt-3 line-clamp-2 text-lg font-black leading-8 text-slate-950">
                {item.title}
              </h3>
            </div>
          </div>

          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              disabled={busy || replaceBusy}
              onClick={() => setMenuOpen((value) => !value)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 disabled:opacity-50"
              aria-label="إجراءات العنصر"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>

            {menuOpen ? (
              <div className="absolute left-0 top-12 z-30 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpen();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  {isFolder ? (
                    <FolderOpen className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {isFolder ? "فتح المحتوى" : "بيانات الملف"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  تعديل البيانات
                </button>

                {!isFolder ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        openReplaceDialog("PDF");
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-black text-sky-700 transition hover:bg-sky-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      استبدال PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        openReplaceDialog("DOCX");
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-black text-sky-700 transition hover:bg-sky-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      استبدال Word
                    </button>

                    {hasPdf ? (
                      <button
                        type="button"
                        disabled={!canRemovePdf}
                        onClick={() => {
                          setMenuOpen(false);
                          setRemoveVariant("PDF");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف PDF
                      </button>
                    ) : null}

                    {hasDocx ? (
                      <button
                        type="button"
                        disabled={!canRemoveDocx}
                        onClick={() => {
                          setMenuOpen(false);
                          setRemoveVariant("DOCX");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف Word
                      </button>
                    ) : null}
                  </>
                ) : null}

                {item.status !== "PUBLISHED" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onChangeStatus("PUBLISHED");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
                  >
                    <Eye className="h-4 w-4" />
                    نشر
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onChangeStatus("DRAFT");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-black text-amber-700 transition hover:bg-amber-50"
                  >
                    <Pencil className="h-4 w-4" />
                    تحويل لمسودة
                  </button>
                )}

                {item.status !== "ARCHIVED" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onChangeStatus("ARCHIVED");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-black text-slate-700 transition hover:bg-slate-100"
                  >
                    <Archive className="h-4 w-4" />
                    أرشفة
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-black text-rose-700 transition hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-4 line-clamp-2 min-h-12 text-sm font-bold leading-6 text-slate-500">
          {item.description ||
            (isFolder
              ? "حقيبة منظمة تضم مجموعة من الأقسام والملفات."
              : "ملف معرفي متاح ضمن مكتبة الموجه الطلابي.")}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
          {isFolder ? (
            <span className="rounded-xl bg-slate-50 px-3 py-2">
              {item._count?.children ?? 0} عنصر
            </span>
          ) : (
            <>
              <span className="rounded-xl bg-slate-50 px-3 py-2">
                {formatVariantSize(item)}
              </span>

              <span className="rounded-xl bg-slate-50 px-3 py-2">
                {item.allowDownload ? "التحميل مسموح" : "التحميل غير متاح"}
              </span>
            </>
          )}

          <span className="rounded-xl bg-slate-50 px-3 py-2">
            تحديث {formatDate(item.updatedAt)}
          </span>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          {isFolder ? (
            <button
              type="button"
              onClick={onOpen}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <FolderOpen className="h-4 w-4" />
              فتح المحتوى
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {hasPdf ? (
                <Link
                  href={`/dashboard/counselor-reference-library/file/${encodeURIComponent(
                    item.id,
                  )}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  <Eye className="h-4 w-4" />
                  معاينة PDF
                </Link>
              ) : null}

              <button
                type="button"
                onClick={() => openReplaceDialog("PDF")}
                disabled={replaceBusy}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                استبدال PDF
              </button>

              <button
                type="button"
                onClick={() => openReplaceDialog("DOCX")}
                disabled={replaceBusy}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                استبدال Word
              </button>
            </div>
          )}
        </div>
      </article>

      {replaceOpen ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
          dir="rtl"
        >
          <div className="my-6 w-full max-w-xl rounded-[32px] border border-white/70 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
                  <RefreshCw className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    {replaceVariant === "PDF"
                      ? "استبدال نسخة PDF"
                      : "استبدال نسخة Word"}
                  </h2>

                  <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                    سيتم استبدال النسخة المحددة فقط مع بقاء العنوان والصلاحيات
                    والرابط كما هي.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeReplaceDialog}
                disabled={replaceBusy}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => replaceInputRef.current?.click()}
              disabled={replaceBusy}
              className="mt-6 flex min-h-40 w-full flex-col items-center justify-center rounded-[26px] border-2 border-dashed border-sky-200 bg-sky-50/60 px-5 py-7 text-center transition hover:border-sky-400 hover:bg-sky-50 disabled:opacity-50"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-sky-700 shadow-sm">
                <UploadCloud className="h-6 w-6" />
              </div>

              <p className="mt-4 font-black text-slate-950">
                {replacementFile
                  ? replacementFile.name
                  : replaceVariant === "PDF"
                    ? "اختر ملف PDF البديل"
                    : "اختر ملف Word البديل"}
              </p>

              <p className="mt-2 text-xs font-bold text-slate-500">
                {replaceVariant === "PDF"
                  ? "PDF، بحد أقصى 50 ميجابايت"
                  : "DOCX، بحد أقصى 50 ميجابايت"}
              </p>

              {replacementFile ? (
                <p className="mt-2 text-xs font-black text-sky-700">
                  {formatFileSize(replacementFile.size)}
                </p>
              ) : null}
            </button>

            <input
              ref={replaceInputRef}
              type="file"
              accept={
                replaceVariant === "PDF"
                  ? ".pdf,application/pdf"
                  : ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              }
              className="hidden"
              onChange={(event) =>
                selectReplacementFile(event.target.files?.[0] ?? null)
              }
            />

            {replaceError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
                {replaceError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeReplaceDialog}
                disabled={replaceBusy}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => {
                  void replaceFile();
                }}
                disabled={replaceBusy || !replacementFile}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {replaceBusy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                تأكيد الاستبدال
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ReferenceLibraryConfirmDialog
        open={Boolean(removeVariant)}
        title={
          removeVariant === "PDF"
            ? "حذف نسخة PDF"
            : "حذف نسخة Word"
        }
        description="سيتم حذف هذه النسخة فقط من العنصر، ولن يمكن حذفها إذا كانت آخر نسخة متبقية."
        confirmLabel="حذف النسخة"
        busy={replaceBusy}
        destructive
        onCancel={() => {
          if (!replaceBusy) {
            setRemoveVariant(null);
          }
        }}
        onConfirm={() => {
          void removeFileVariant();
        }}
      />
    </>
  );
}

function formatVariantSize(item: ReferenceLibraryAdminItem) {
  const sizes = [
    item.pdfSizeBytes ? `PDF ${formatFileSize(item.pdfSizeBytes)}` : null,
    item.docxSizeBytes ? `Word ${formatFileSize(item.docxSizeBytes)}` : null,
  ].filter(Boolean);

  return sizes.length > 0 ? sizes.join(" / ") : "حجم غير محدد";
}

function formatFileSize(size: number | null) {
  if (!size) {
    return "حجم غير محدد";
  }

  if (size < 1024) {
    return `${size} بايت`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} كيلوبايت`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} ميجابايت`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
