"use client";

import {
  Archive,
  BookOpen,
  ChevronLeft,
  FileText,
  FolderOpen,
  FolderPlus,
  LoaderCircle,
  Plus,
  Search,
  UploadCloud,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AdminReferenceFolderDialog } from "@/components/reference-library/admin-reference-folder-dialog";
import { AdminReferenceUploadDialog } from "@/components/reference-library/admin-reference-upload-dialog";
import { AdminReferenceItemCard } from "@/components/reference-library/admin-reference-item-card";
import { AdminReferenceEditDialog } from "@/components/reference-library/admin-reference-edit-dialog";
import { ReferenceLibraryConfirmDialog } from "@/components/reference-library/reference-library-confirm-dialog";
import { ReferenceLibraryFeedbackCard } from "@/components/reference-library/reference-library-feedback-card";
import type {
  ReferenceLibraryAdminItem,
  ReferenceLibraryAdminParent,
  ReferenceLibraryFeedback,
  ReferenceLibraryItemsResponse,
} from "@/components/reference-library/admin-reference-library-types";

type Breadcrumb = {
  id: string | null;
  title: string;
};

type PendingAction =
  | {
      type: "DELETE";
      item: ReferenceLibraryAdminItem;
    }
  | {
      type: "STATUS";
      item: ReferenceLibraryAdminItem;
      status:
        | "DRAFT"
        | "PUBLISHED"
        | "ARCHIVED";
    }
  | null;

export function AdminReferenceLibraryCenter() {
  const [items, setItems] = useState<
    ReferenceLibraryAdminItem[]
  >([]);
  const [parent, setParent] =
    useState<ReferenceLibraryAdminParent | null>(
      null,
    );
  const [breadcrumbs, setBreadcrumbs] =
    useState<Breadcrumb[]>([
      {
        id: null,
        title: "المرجع الشامل",
      },
    ]);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] =
    useState("");
  const [status, setStatus] = useState<
    "" | "DRAFT" | "PUBLISHED" | "ARCHIVED"
  >("");

  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] =
    useState(false);
  const [folderDialogOpen, setFolderDialogOpen] =
    useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] =
    useState(false);
  const [pendingAction, setPendingAction] =
    useState<PendingAction>(null);
  const [editingItem, setEditingItem] =
    useState<ReferenceLibraryAdminItem | null>(null);
  const [feedback, setFeedback] =
    useState<ReferenceLibraryFeedback>(null);

  const currentParentId =
    breadcrumbs.at(-1)?.id ?? null;

  const loadItems = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (currentParentId) {
        params.set("parentId", currentParentId);
      }

      if (appliedSearch) {
        params.set("search", appliedSearch);
      }

      if (status) {
        params.set("status", status);
      }

      const response = await fetch(
        `/api/dashboard/admin/counselor-reference-library/items?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const payload =
        (await response
          .json()
          .catch(() => null)) as
          | ReferenceLibraryItemsResponse
          | {
              error?: string;
            }
          | null;

      if (!response.ok) {
        throw new Error(
          payload &&
          "error" in payload &&
          payload.error
            ? payload.error
            : "تعذر تحميل المحتوى.",
        );
      }

      const result =
        payload as ReferenceLibraryItemsResponse;

      setItems(result.items);
      setParent(result.parent);
    } catch (requestError) {
      setItems([]);
      setFeedback({
        type: "error",
        title: "تعذر تحميل المرجع",
        message:
          requestError instanceof Error
            ? requestError.message
            : "تعذر تحميل المحتوى.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    appliedSearch,
    currentParentId,
    status,
  ]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const stats = useMemo(() => {
    return {
      folders: items.filter(
        (item) => item.itemType === "FOLDER",
      ).length,
      files: items.filter(
        (item) => item.itemType === "FILE",
      ).length,
      published: items.filter(
        (item) => item.status === "PUBLISHED",
      ).length,
      drafts: items.filter(
        (item) => item.status === "DRAFT",
      ).length,
    };
  }, [items]);

  function openFolder(
    item: ReferenceLibraryAdminItem,
  ) {
    if (item.itemType !== "FOLDER") {
      setFeedback({
        type: "warning",
        title: "إدارة الملف",
        message:
          "المعاينة والاستبدال ستضاف في الدفعة الرابعة.",
      });
      return;
    }

    setSearch("");
    setAppliedSearch("");
    setStatus("");

    setBreadcrumbs((current) => [
      ...current,
      {
        id: item.id,
        title: item.title,
      },
    ]);
  }

  function navigateToBreadcrumb(index: number) {
    setSearch("");
    setAppliedSearch("");
    setStatus("");
    setBreadcrumbs((current) =>
      current.slice(0, index + 1),
    );
  }

  async function executePendingAction() {
    if (!pendingAction) {
      return;
    }

    setActionBusy(true);

    try {
      if (pendingAction.type === "DELETE") {
        const response = await fetch(
          `/api/dashboard/admin/counselor-reference-library/items/${encodeURIComponent(
            pendingAction.item.id,
          )}`,
          {
            method: "DELETE",
          },
        );

        const payload = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              "تعذر حذف العنصر.",
          );
        }

        setFeedback({
          type: "success",
          title: "تم الحذف",
          message:
            payload?.message ||
            "تم حذف العنصر بنجاح.",
        });
      } else {
        const response = await fetch(
          `/api/dashboard/admin/counselor-reference-library/items/${encodeURIComponent(
            pendingAction.item.id,
          )}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: pendingAction.status,
            }),
          },
        );

        const payload = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              "تعذر تحديث حالة العنصر.",
          );
        }

        setFeedback({
          type: "success",
          title: "تم تحديث الحالة",
          message:
            payload?.message ||
            "تم تحديث العنصر بنجاح.",
        });
      }

      setPendingAction(null);
      await loadItems();
    } catch (requestError) {
      setFeedback({
        type: "error",
        title: "تعذر تنفيذ الإجراء",
        message:
          requestError instanceof Error
            ? requestError.message
            : "تعذر تنفيذ العملية.",
      });
    } finally {
      setActionBusy(false);
    }
  }

  const confirmTitle =
    pendingAction?.type === "DELETE"
      ? "حذف العنصر"
      : pendingAction?.type === "STATUS" &&
          pendingAction.status === "ARCHIVED"
        ? "أرشفة العنصر"
        : "تغيير حالة العنصر";

  const confirmDescription =
    pendingAction?.type === "DELETE"
      ? pendingAction.item.itemType === "FOLDER"
        ? "سيحذف المجلد إذا كان فارغًا فقط. المجلد الذي يحتوي عناصر لن يُحذف."
        : "سيحذف الملف وبياناته من المرجع الشامل."
      : pendingAction?.type === "STATUS"
        ? `سيتم تغيير حالة «${pendingAction.item.title}» إلى ${
            pendingAction.status === "PUBLISHED"
              ? "منشور"
              : pendingAction.status === "ARCHIVED"
                ? "مؤرشف"
                : "مسودة"
          }.`
        : "";

  return (
    <div
      className="space-y-7 pb-10"
      dir="rtl"
    >
      <section className="overflow-hidden rounded-[36px] bg-gradient-to-l from-sky-500 via-sky-600 to-slate-800 p-6 text-white shadow-[0_18px_45px_rgba(30,64,175,0.18)] sm:p-8">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-white/75">
              <BookOpen className="h-4 w-4" />
              خدمة مستقلة
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              إدارة المرجع الشامل
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-white/85 sm:text-base">
              أنشئ الحقائب والأقسام، وارفع الأدلة
              والملفات، ثم انشرها للموجهين
              الطلابيين بطريقة منظمة وسهلة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setFolderDialogOpen(true)
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5"
            >
              <FolderPlus className="h-4 w-4" />
              {currentParentId
                ? "إضافة قسم"
                : "إنشاء حقيبة"}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!currentParentId) {
                  setFeedback({
                    type: "warning",
                    title: "اختر حقيبة أولًا",
                    message:
                      "افتح حقيبة أو قسمًا، ثم ارفع الملف داخله.",
                  });
                  return;
                }

                setUploadDialogOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
            >
              <UploadCloud className="h-4 w-4" />
              رفع ملف
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="المجلدات"
          value={stats.folders}
          icon={<FolderOpen className="h-5 w-5" />}
        />

        <StatCard
          label="الملفات"
          value={stats.files}
          icon={<FileText className="h-5 w-5" />}
        />

        <StatCard
          label="المنشور"
          value={stats.published}
          icon={<BookOpen className="h-5 w-5" />}
        />

        <StatCard
          label="المسودات"
          value={stats.drafts}
          icon={<Archive className="h-5 w-5" />}
        />
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black text-sky-700">
                المحتوى الحالي
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {parent?.title ||
                  "الحقائب الرئيسية"}
              </h2>

              <p className="mt-2 text-sm font-bold text-slate-500">
                {currentParentId
                  ? "الأقسام والملفات الموجودة داخل هذا المستوى."
                  : "ابدأ بإنشاء حقيبة رئيسية، ثم أضف الأقسام والملفات بداخلها."}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setAppliedSearch(search.trim());
                }}
                className="relative"
              >
                <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="ابحث داخل المستوى..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white sm:w-72"
                />
              </form>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      | ""
                      | "DRAFT"
                      | "PUBLISHED"
                      | "ARCHIVED",
                  )
                }
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none"
              >
                <option value="">
                  كل الحالات
                </option>
                <option value="PUBLISHED">
                  منشور
                </option>
                <option value="DRAFT">
                  مسودة
                </option>
                <option value="ARCHIVED">
                  مؤرشف
                </option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            {breadcrumbs.map(
              (breadcrumb, index) => (
                <div
                  key={
                    breadcrumb.id ??
                    "reference-root"
                  }
                  className="flex items-center gap-2"
                >
                  {index > 0 ? (
                    <ChevronLeft className="h-4 w-4 text-slate-300" />
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      navigateToBreadcrumb(index)
                    }
                    className={
                      index ===
                      breadcrumbs.length - 1
                        ? "rounded-xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700"
                        : "rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                    }
                  >
                    {breadcrumb.title}
                  </button>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <LoadingGrid />
      ) : items.length > 0 ? (
        <section className="grid gap-5 lg:grid-cols-2">
          {items.map((item) => (
            <AdminReferenceItemCard
              key={item.id}
              item={item}
              busy={actionBusy}
              onOpen={() => openFolder(item)}
              onEdit={() => setEditingItem(item)}
              onChangeStatus={(nextStatus) =>
                setPendingAction({
                  type: "STATUS",
                  item,
                  status: nextStatus,
                })
              }
              onDelete={() =>
                setPendingAction({
                  type: "DELETE",
                  item,
                })
              }
              onReplaced={(message) => {
                setFeedback({
                  type: "success",
                  title: "تم استبدال الملف",
                  message,
                });

                void loadItems();
              }}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-sky-50 text-sky-700">
            <BookOpen className="h-7 w-7" />
          </div>

          <h3 className="mt-5 text-xl font-black text-slate-950">
            لا يوجد محتوى في هذا المستوى
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm font-bold leading-7 text-slate-500">
            أنشئ حقيبة أو قسمًا جديدًا، وبعد فتح
            المجلد تستطيع رفع ملفات PDF وWord
            داخله.
          </p>

          <button
            type="button"
            onClick={() =>
              setFolderDialogOpen(true)
            }
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            {currentParentId
              ? "إضافة قسم"
              : "إنشاء أول حقيبة"}
          </button>
        </section>
      )}

      <AdminReferenceFolderDialog
        open={folderDialogOpen}
        parentId={currentParentId}
        parentTitle={parent?.title ?? null}
        onClose={() =>
          setFolderDialogOpen(false)
        }
        onCreated={(message) => {
          setFeedback({
            type: "success",
            title: "تم إنشاء المحتوى",
            message,
          });
          void loadItems();
        }}
      />

      <AdminReferenceUploadDialog
        open={uploadDialogOpen}
        parentId={currentParentId}
        parentTitle={parent?.title ?? null}
        onClose={() =>
          setUploadDialogOpen(false)
        }
        onUploaded={(message) => {
          setFeedback({
            type: "success",
            title: "اكتمل رفع الملف",
            message,
          });
          void loadItems();
        }}
      />

      <AdminReferenceEditDialog
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={(message) => {
          setFeedback({
            type: "success",
            title: "تم حفظ التعديلات",
            message,
          });
          void loadItems();
        }}
      />

      <ReferenceLibraryConfirmDialog
        open={Boolean(pendingAction)}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={
          pendingAction?.type === "DELETE"
            ? "حذف العنصر"
            : "تأكيد التغيير"
        }
        busy={actionBusy}
        destructive={
          pendingAction?.type === "DELETE"
        }
        onCancel={() => {
          if (!actionBusy) {
            setPendingAction(null);
          }
        }}
        onConfirm={() => {
          void executePendingAction();
        }}
      />

      <ReferenceLibraryFeedbackCard
        feedback={feedback}
        onClose={() => setFeedback(null)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black text-slate-950">
            {value}
          </p>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      {Array.from({
        length: 4,
      }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[28px] border border-slate-200 bg-white p-5"
        >
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100" />

            <div className="flex-1">
              <div className="h-5 w-24 rounded bg-slate-100" />
              <div className="mt-4 h-6 w-2/3 rounded bg-slate-100" />
            </div>
          </div>

          <div className="mt-5 h-4 w-full rounded bg-slate-100" />
          <div className="mt-2 h-4 w-3/4 rounded bg-slate-100" />
          <div className="mt-6 h-10 w-32 rounded-2xl bg-slate-100" />
        </div>
      ))}
    </section>
  );
}
