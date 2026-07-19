"use client";

import {
  FolderPlus,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

type AudienceMode =
  | "INHERIT"
  | "COUNSELOR"
  | "ALL_USERS";

export function AdminReferenceFolderDialog({
  open,
  parentId,
  parentTitle,
  onClose,
  onCreated,
}: {
  open: boolean;
  parentId: string | null;
  parentTitle: string | null;
  onClose: () => void;
  onCreated: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<
    "DRAFT" | "PUBLISHED"
  >("PUBLISHED");
  const [audienceMode, setAudienceMode] =
    useState<AudienceMode>(
      parentId ? "INHERIT" : "COUNSELOR",
    );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle("");
    setDescription("");
    setStatus("PUBLISHED");
    setAudienceMode(
      parentId ? "INHERIT" : "COUNSELOR",
    );
    setError("");
    setBusy(false);
  }, [open, parentId]);

  if (!open) {
    return null;
  }

  async function submit() {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setError("اكتب اسم الحقيبة أو القسم.");
      return;
    }

    setBusy(true);
    setError("");

    const audiences =
      audienceMode === "ALL_USERS"
        ? [
            {
              audienceType: "ALL_USERS",
            },
          ]
        : [
            {
              audienceType: "ROLE",
              role: "COUNSELOR",
            },
          ];

    try {
      const response = await fetch(
        "/api/dashboard/admin/counselor-reference-library/items",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: normalizedTitle,
            description: description.trim() || null,
            parentId,
            status,
            sortOrder: 0,
            inheritAudience:
              audienceMode === "INHERIT",
            audiences,
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "تعذر إنشاء الحقيبة.",
        );
      }

      onCreated(
        payload?.message ||
          "تم إنشاء الحقيبة بنجاح.",
      );
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر إنشاء الحقيبة.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/35 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="my-6 w-full max-w-xl rounded-[32px] border border-white/70 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              <FolderPlus className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                {parentId
                  ? "إضافة قسم جديد"
                  : "إنشاء حقيبة رئيسية"}
              </h2>

              <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                {parentTitle
                  ? `سيضاف داخل: ${parentTitle}`
                  : "ستظهر الحقيبة في المستوى الرئيسي للمستخدمين."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
              الاسم
            </span>

            <input
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              maxLength={200}
              placeholder="مثال: حقيبة التوجيه الطلابي"
              className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
              الوصف
            </span>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={4}
              maxLength={5000}
              placeholder="وصف مختصر يساعد المستخدم على معرفة محتوى الحقيبة."
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-7 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
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
                      | "PUBLISHED",
                  )
                }
                className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none"
              >
                <option value="PUBLISHED">
                  منشور
                </option>
                <option value="DRAFT">
                  مسودة
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                المستفيدون
              </span>

              <select
                value={audienceMode}
                onChange={(event) =>
                  setAudienceMode(
                    event.target.value as AudienceMode,
                  )
                }
                className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none"
              >
                {parentId ? (
                  <option value="INHERIT">
                    نفس مستفيدي المجلد الأب
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
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <FolderPlus className="h-4 w-4" />
            )}

            حفظ الحقيبة
          </button>
        </div>
      </div>
    </div>
  );
}