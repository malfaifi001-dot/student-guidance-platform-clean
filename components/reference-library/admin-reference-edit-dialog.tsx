"use client";

import {
  LoaderCircle,
  Pencil,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReferenceLibraryAdminItem } from "@/components/reference-library/admin-reference-library-types";

type AudienceMode = "INHERIT" | "COUNSELOR" | "ALL_USERS" | "CUSTOM";

function getInitialAudienceMode(
  item: ReferenceLibraryAdminItem,
): AudienceMode {
  if (item.audiences.length === 0) {
    return "INHERIT";
  }

  if (
    item.audiences.some(
      (audience) => audience.audienceType === "ALL_USERS",
    )
  ) {
    return "ALL_USERS";
  }

  if (
    item.audiences.length === 1 &&
    item.audiences[0]?.audienceType === "ROLE" &&
    item.audiences[0]?.role === "COUNSELOR"
  ) {
    return "COUNSELOR";
  }

  return "CUSTOM";
}

export function AdminReferenceEditDialog({
  item,
  onClose,
  onSaved,
}: {
  item: ReferenceLibraryAdminItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [status, setStatus] = useState<
    "DRAFT" | "PUBLISHED" | "ARCHIVED"
  >("DRAFT");
  const [allowDownload, setAllowDownload] = useState(true);
  const [audienceMode, setAudienceMode] =
    useState<AudienceMode>("COUNSELOR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isFile = item?.itemType === "FILE";
  const titleLabel = isFile ? "عنوان الملف" : "عنوان الحقيبة";

  const audiences = useMemo(() => {
    if (audienceMode === "CUSTOM") {
      return null;
    }

    if (audienceMode === "ALL_USERS") {
      return [
        {
          audienceType: "ALL_USERS",
        },
      ];
    }

    return [
      {
        audienceType: "ROLE",
        role: "COUNSELOR",
      },
    ];
  }, [audienceMode]);

  useEffect(() => {
    if (!item) {
      return;
    }

    setTitle(item.title);
    setDescription(item.description ?? "");
    setSortOrder(String(item.sortOrder));
    setStatus(item.status);
    setAllowDownload(item.allowDownload);
    setAudienceMode(getInitialAudienceMode(item));
    setBusy(false);
    setError("");
  }, [item]);

  if (!item) {
    return null;
  }

  async function submit() {
    if (!item) {
      return;
    }

    const currentItem = item;
    const normalizedTitle = title.trim();
    const normalizedSortOrder = Number(sortOrder);

    if (!normalizedTitle) {
      setError("العنوان مطلوب.");
      return;
    }

    if (normalizedTitle.length > 200) {
      setError("العنوان يجب ألا يتجاوز 200 حرف.");
      return;
    }

    if (!Number.isSafeInteger(normalizedSortOrder)) {
      setError("ترتيب العرض يجب أن يكون رقمًا صحيحًا.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/admin/counselor-reference-library/items/${encodeURIComponent(
          currentItem.id,
        )}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: normalizedTitle,
            description: description.trim() || null,
            sortOrder: normalizedSortOrder,
            status,
            ...(isFile
              ? {
                  allowDownload,
                }
              : {}),
            ...(audienceMode !== "CUSTOM"
              ? {
                  inheritAudience: audienceMode === "INHERIT",
                  audiences,
                }
              : {}),
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "تعذر حفظ التعديلات.",
        );
      }

      onSaved(payload?.message || "تم حفظ التعديلات بنجاح.");
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر حفظ التعديلات.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="my-6 w-full max-w-xl rounded-[32px] border border-white/70 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              <Pencil className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                تعديل البيانات
              </h2>

              <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                يتم تعديل البيانات فقط دون استبدال ملفات PDF أو Word.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
              {titleLabel}
            </span>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
              الوصف
            </span>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={5000}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-7 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                ترتيب العرض
              </span>

              <input
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                type="number"
                step={1}
                className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                حالة النشر
              </span>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      | "DRAFT"
                      | "PUBLISHED"
                      | "ARCHIVED",
                  )
                }
                className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none"
              >
                <option value="PUBLISHED">منشور</option>
                <option value="DRAFT">مسودة</option>
                <option value="ARCHIVED">مؤرشف</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                المستفيدون
              </span>

              <select
                value={audienceMode}
                onChange={(event) =>
                  setAudienceMode(event.target.value as AudienceMode)
                }
                className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none"
              >
                <option value="INHERIT">
                  نفس مستفيدي المجلد الأب
                </option>
                {audienceMode === "CUSTOM" ? (
                  <option value="CUSTOM">
                    إعدادات مخصصة محفوظة
                  </option>
                ) : null}
                <option value="COUNSELOR">
                  الموجهون الطلابيون
                </option>
                <option value="ALL_USERS">
                  جميع المستخدمين
                </option>
              </select>
            </label>

            {isFile ? (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    السماح بالتحميل
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    يطبق على نسخ PDF وWord المتاحة.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(event) =>
                    setAllowDownload(event.target.checked)
                  }
                  className="h-5 w-5 rounded border-slate-300 accent-sky-600"
                />
              </label>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={() => {
              void submit();
            }}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
            حفظ التعديلات
          </button>
        </div>
      </div>
    </div>
  );
}
