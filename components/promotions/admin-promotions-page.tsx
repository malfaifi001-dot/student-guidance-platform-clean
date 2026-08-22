"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";

import { BrandLoader } from "@/components/common/brand-loader";
import { SmartActionModal } from "@/components/ui/smart-action-modal";

type Plan = { id: string; name: string; slug: string };
type Coupon = {
  id: string;
  code: string;
  isActive: boolean;
  usageLimit: number | null;
  expiresAt: string | null;
  _count: { redemptions: number };
};
type Promotion = {
  id: string;
  name: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  isAutomatic: boolean;
  totalUsageLimit: number | null;
  perAccountLimit: number | null;
  plans: Array<{ plan: Plan }>;
  coupons: Coupon[];
  _count: { redemptions: number };
};
type Redemption = {
  id: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  redeemedAt: string;
  coupon: { code: string };
  promotion: { name: string };
  plan: { name: string };
  schoolAccount: { name: string };
};

type DeleteTarget =
  | { kind: "promotion"; id: string; label: string }
  | { kind: "coupon"; id: string; label: string };

async function readResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export function AdminPromotionsPage() {
  const [data, setData] = useState<{
    plans: Plan[];
    promotions: Promotion[];
    redemptions: Redemption[];
    metrics: { redemptionCount: number; discountTotal: number };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "20",
    startsAt: "",
    endsAt: "",
    totalUsageLimit: "",
    perAccountLimit: "1",
    isActive: true,
    isAutomatic: false,
  });
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [couponDrafts, setCouponDrafts] = useState<
    Record<string, { code: string; usageLimit: string; expiresAt: string }>
  >({});
  const [activeTab, setActiveTab] = useState<
    "active" | "coupons" | "scheduled" | "expired" | "archived"
  >("active");
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  async function load() {
    const response = await fetch("/api/dashboard/admin/promotions", {
      cache: "no-store",
    });
    const result = await readResponse(response);
    if (response.ok) setData(result);
    else setMessage(result.error || "تعذر تحميل العروض.");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function action(payload: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/dashboard/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readResponse(response);
      setMessage(result.message || result.error || "تعذر تنفيذ العملية.");
      if (response.ok) await load();
      return response.ok;
    } catch {
      setMessage("تعذر الاتصال بالخادم. حاول مرة أخرى.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const ok = await action(
      deleteTarget.kind === "promotion"
        ? { action: "delete-promotion", promotionId: deleteTarget.id }
        : { action: "delete-coupon", couponId: deleteTarget.id },
    );
    if (ok) setDeleteTarget(null);
  }

  const stats = useMemo(() => {
    const promotions = data?.promotions || [];
    const coupons = promotions.flatMap((item) => item.coupons);
    return {
      activePromotions: promotions.filter((item) => item.isActive).length,
      activeCoupons: coupons.filter((item) => item.isActive).length,
      uses: data?.metrics.redemptionCount || 0,
      discounts: data?.metrics.discountTotal || 0,
    };
  }, [data]);

  const visiblePromotions = useMemo(() => {
    const now = Date.now();
    const promotions = data?.promotions || [];
    if (activeTab === "coupons") return promotions;
    if (activeTab === "scheduled")
      return promotions.filter(
        (item) =>
          item.isActive &&
          item.startsAt &&
          new Date(item.startsAt).getTime() > now,
      );
    if (activeTab === "expired")
      return promotions.filter(
        (item) => item.endsAt && new Date(item.endsAt).getTime() < now,
      );
    if (activeTab === "archived") return [];
    return promotions.filter(
      (item) =>
        item.isActive &&
        (!item.startsAt || new Date(item.startsAt).getTime() <= now) &&
        (!item.endsAt || new Date(item.endsAt).getTime() >= now),
    );
  }, [activeTab, data]);

  if (!data)
    return <BrandLoader variant="section" label="جاري تحميل العروض..." />;

  return (
    <main className="min-w-0 space-y-6" dir="rtl">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-700">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-950">
              العروض والكوبونات
            </h1>
            <p className="mt-1 text-sm font-bold text-slate-500">
              خصومات بسيطة ومخصصة لباقات تيتش اكس.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setEditorOpen(true);
          }}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white"
        >
          <Plus className="h-4 w-4" />
          إنشاء عرض
        </button>
      </header>

      {message ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
          {message}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["العروض الفعالة", stats.activePromotions],
          ["الكوبونات الفعالة", stats.activeCoupons],
          ["مرات الاستخدام", stats.uses],
          ["قيمة الخصومات", `${stats.discounts} ريال`],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-3xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <nav
        className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
        aria-label="Promotion sections"
      >
        <div className="flex min-w-max gap-2">
          {(
            [
              ["active", "العروض النشطة"],
              ["coupons", "الكوبونات"],
              ["scheduled", "العروض المجدولة"],
              ["expired", "العروض المنتهية"],
              ["archived", "المؤرشفة"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${activeTab === key ? "bg-sky-700 text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {label}
              {key === "archived" ? " (0)" : ""}
            </button>
          ))}
        </div>
      </nav>

      <section
        className={`${editorOpen || editingId ? "" : "hidden"} rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6`}
      >
        <h2 className="text-lg font-black text-slate-950">
          {editingId ? "تعديل العرض" : "إنشاء عرض"}
        </h2>
        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="اسم العرض"
            className="h-11 min-w-0 rounded-2xl border border-slate-200 px-4 text-sm font-bold"
          />
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="وصف مختصر"
            className="h-11 min-w-0 rounded-2xl border border-slate-200 px-4 text-sm font-bold"
          />
          <select
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
            className="h-11 min-w-0 rounded-2xl border border-slate-200 px-4 text-sm font-bold"
          >
            <option value="PERCENTAGE">نسبة مئوية</option>
            <option value="FIXED_AMOUNT">مبلغ ثابت</option>
          </select>
          <input
            type="number"
            min="1"
            max={form.discountType === "PERCENTAGE" ? 100 : undefined}
            value={form.discountValue}
            onChange={(e) =>
              setForm({ ...form, discountValue: e.target.value })
            }
            placeholder="قيمة الخصم"
            className="h-11 min-w-0 rounded-2xl border border-slate-200 px-4 text-sm font-bold"
          />
          <label className="text-xs font-black text-slate-500">
            تاريخ البداية
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="mt-1 h-11 w-full min-w-0 rounded-2xl border border-slate-200 px-4 text-sm"
            />
          </label>
          <label className="text-xs font-black text-slate-500">
            تاريخ النهاية
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="mt-1 h-11 w-full min-w-0 rounded-2xl border border-slate-200 px-4 text-sm"
            />
          </label>
          <input
            type="number"
            min="1"
            value={form.totalUsageLimit}
            onChange={(e) =>
              setForm({ ...form, totalUsageLimit: e.target.value })
            }
            placeholder="الحد الإجمالي - اختياري"
            className="h-11 min-w-0 rounded-2xl border border-slate-200 px-4 text-sm font-bold"
          />
          <input
            type="number"
            min="1"
            value={form.perAccountLimit}
            onChange={(e) =>
              setForm({ ...form, perAccountLimit: e.target.value })
            }
            placeholder="الحد لكل حساب - اختياري"
            className="h-11 min-w-0 rounded-2xl border border-slate-200 px-4 text-sm font-bold"
          />
        </div>
        <label className="mt-4 flex w-fit items-center gap-2 text-sm font-black text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          العرض فعال
        </label>
        <label className="mt-3 flex w-fit items-center gap-2 text-sm font-black text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(form.isAutomatic)}
            onChange={(e) =>
              setForm({ ...form, isAutomatic: e.target.checked })
            }
          />
          عرض تلقائي على بطاقات الباقات (بدون كوبون)
        </label>
        <div className="mt-4">
          <p className="text-xs font-black text-slate-500">
            الباقات المشمولة — اتركها فارغة لتطبيق العرض على كل الباقات
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.plans.map((plan) => (
              <label
                key={plan.id}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
              >
                <input
                  type="checkbox"
                  checked={planIds.includes(plan.id)}
                  onChange={() =>
                    setPlanIds((current) =>
                      current.includes(plan.id)
                        ? current.filter((id) => id !== plan.id)
                        : [...current, plan.id],
                    )
                  }
                />
                {plan.name}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() =>
              void action({
                action: editingId ? "update-promotion" : "create-promotion",
                promotionId: editingId,
                ...form,
                planIds,
              }).then((ok) => {
                if (ok) {
                  setForm({ ...form, name: "", description: "" });
                  setPlanIds([]);
                  setEditingId(null);
                }
              })
            }
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {editingId ? "حفظ التعديل" : "إنشاء عرض"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-black"
            >
              إلغاء
            </button>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        {visiblePromotions.map((promotion) => (
          <article
            key={promotion.id}
            className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-slate-950">
                    {promotion.name}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${promotion.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {promotion.isActive ? "فعال" : "متوقف"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {promotion.discountType === "PERCENTAGE"
                    ? `${promotion.discountValue}%`
                    : `${promotion.discountValue} ريال`}{" "}
                  ·{" "}
                  {promotion.plans.length
                    ? promotion.plans.map((item) => item.plan.name).join("، ")
                    : "كل الباقات"}{" "}
                  · {promotion._count.redemptions} استخدام
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingId(promotion.id);
                    setForm({
                      name: promotion.name,
                      description: promotion.description || "",
                      discountType: promotion.discountType,
                      discountValue: String(promotion.discountValue),
                      startsAt: promotion.startsAt?.slice(0, 16) || "",
                      endsAt: promotion.endsAt?.slice(0, 16) || "",
                      totalUsageLimit: promotion.totalUsageLimit
                        ? String(promotion.totalUsageLimit)
                        : "",
                      perAccountLimit: promotion.perAccountLimit
                        ? String(promotion.perAccountLimit)
                        : "",
                      isActive: promotion.isActive,
                      isAutomatic: promotion.isAutomatic,
                    });
                    setPlanIds(promotion.plans.map((item) => item.plan.id));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black"
                >
                  تعديل
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action({
                      action: "toggle-promotion",
                      promotionId: promotion.id,
                      isActive: !promotion.isActive,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700"
                >
                  {promotion.isActive ? "إيقاف" : "تفعيل"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setDeleteTarget({
                      kind: "promotion",
                      id: promotion.id,
                      label: promotion.name,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </button>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_150px_190px_auto]">
                <input
                  value={couponDrafts[promotion.id]?.code || ""}
                  onChange={(e) =>
                    setCouponDrafts({
                      ...couponDrafts,
                      [promotion.id]: {
                        code: e.target.value.toUpperCase(),
                        usageLimit:
                          couponDrafts[promotion.id]?.usageLimit || "",
                        expiresAt: couponDrafts[promotion.id]?.expiresAt || "",
                      },
                    })
                  }
                  placeholder="رمز الكوبون"
                  dir="ltr"
                  className="h-11 min-w-0 rounded-2xl border border-slate-200 px-4 text-sm font-bold uppercase"
                />
                <input
                  type="number"
                  min="1"
                  value={couponDrafts[promotion.id]?.usageLimit || ""}
                  onChange={(e) =>
                    setCouponDrafts({
                      ...couponDrafts,
                      [promotion.id]: {
                        code: couponDrafts[promotion.id]?.code || "",
                        usageLimit: e.target.value,
                        expiresAt: couponDrafts[promotion.id]?.expiresAt || "",
                      },
                    })
                  }
                  placeholder="حد الاستخدام"
                  className="h-11 min-w-0 rounded-2xl border border-slate-200 px-3 text-sm"
                />
                <input
                  type="datetime-local"
                  value={couponDrafts[promotion.id]?.expiresAt || ""}
                  onChange={(e) =>
                    setCouponDrafts({
                      ...couponDrafts,
                      [promotion.id]: {
                        code: couponDrafts[promotion.id]?.code || "",
                        usageLimit:
                          couponDrafts[promotion.id]?.usageLimit || "",
                        expiresAt: e.target.value,
                      },
                    })
                  }
                  className="h-11 min-w-0 rounded-2xl border border-slate-200 px-3 text-sm"
                />
                <button
                  disabled={busy}
                  onClick={() =>
                    void action({
                      action: "create-coupon",
                      promotionId: promotion.id,
                      ...(couponDrafts[promotion.id] || {}),
                    }).then((ok) => {
                      if (ok)
                        setCouponDrafts({
                          ...couponDrafts,
                          [promotion.id]: {
                            code: "",
                            usageLimit: "",
                            expiresAt: "",
                          },
                        });
                    })
                  }
                  className="h-11 rounded-2xl bg-sky-700 px-5 text-sm font-black text-white"
                >
                  إضافة كوبون
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {promotion.coupons.map((coupon) => (
                  <div key={coupon.id} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void action({
                          action: "toggle-coupon",
                          couponId: coupon.id,
                          isActive: !coupon.isActive,
                        })
                      }
                      className={`rounded-lg px-2 py-1 text-xs font-black ${coupon.isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-400"}`}
                      dir="ltr"
                    >
                      {coupon.code} · {coupon._count.redemptions}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setDeleteTarget({
                          kind: "coupon",
                          id: coupon.id,
                          label: coupon.code,
                        })
                      }
                      className="grid h-8 w-8 place-items-center rounded-lg text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      aria-label={`حذف الكوبون ${coupon.code}`}
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="p-5">
          <h2 className="text-lg font-black text-slate-950">سجل الاستخدام</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {[
                  "الكوبون",
                  "العرض",
                  "الحساب",
                  "الباقة",
                  "الأصلي",
                  "الخصم",
                  "الإجمالي",
                  "التاريخ",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-black">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.redemptions.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-black" dir="ltr">
                    {item.coupon.code}
                  </td>
                  <td className="px-4 py-3">{item.promotion.name}</td>
                  <td className="px-4 py-3">{item.schoolAccount.name}</td>
                  <td className="px-4 py-3">{item.plan.name}</td>
                  <td className="px-4 py-3">{item.originalAmount}</td>
                  <td className="px-4 py-3">{item.discountAmount}</td>
                  <td className="px-4 py-3 font-black">{item.finalAmount}</td>
                  <td className="px-4 py-3">
                    {new Date(item.redeemedAt).toLocaleDateString("ar-SA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <SmartActionModal
        open={Boolean(deleteTarget)}
        title="تأكيد الحذف"
        description={
          deleteTarget
            ? `هل أنت متأكد من حذف ${deleteTarget.kind === "promotion" ? "العرض" : "الكوبون"} «${deleteTarget.label}»؟ سيتم حذف العنصر نهائيًا إذا لم يكن له سجل استخدام.`
            : undefined
        }
        variant="danger"
        confirmLabel="حذف"
        loading={busy}
        portal
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  );
}
