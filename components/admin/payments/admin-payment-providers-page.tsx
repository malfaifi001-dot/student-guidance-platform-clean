"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PaymentProvider = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  configJson: {
    mode?: string;
    publicKey?: string;
    secretKey?: string;
    webhookSecret?: string;
    checkoutBaseUrl?: string;
    notes?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type ProvidersResponse = {
  providers: PaymentProvider[];
};

const defaultForm = {
  name: "",
  slug: "",
  isActive: false,
  mode: "TEST",
  publicKey: "",
  secretKey: "",
  webhookSecret: "",
  checkoutBaseUrl: "",
  notes: "",
};

function getConfig(provider: PaymentProvider) {
  return provider.configJson && typeof provider.configJson === "object"
    ? provider.configJson
    : {};
}

export function AdminPaymentProvidersPage() {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadProviders() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/dashboard/admin/payments/providers", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as ProvidersResponse | null;

      if (!response.ok) {
        throw new Error((payload as { error?: string } | null)?.error || "تعذر تحميل مزودي الدفع.");
      }

      setProviders(payload?.providers || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء تحميل مزودي الدفع."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function saveProvider() {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/dashboard/admin/payments/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر حفظ مزود الدفع.");
      }

      setMessage(payload?.message || "تم حفظ مزود الدفع بنجاح.");
      setForm(defaultForm);
      await loadProviders();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء حفظ مزود الدفع."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleProvider(provider: PaymentProvider) {
    setMessage("");
    setErrorMessage("");

    const config = getConfig(provider);

    try {
      const response = await fetch(
        `/api/dashboard/admin/payments/providers/${provider.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !provider.isActive,
            mode: config.mode || "TEST",
            publicKey: config.publicKey || "",
            secretKey: config.secretKey || "",
            webhookSecret: config.webhookSecret || "",
            checkoutBaseUrl: config.checkoutBaseUrl || "",
            notes: config.notes || "",
          }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحديث مزود الدفع.");
      }

      setMessage(payload?.message || "تم تحديث مزود الدفع.");
      await loadProviders();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء تحديث مزود الدفع."
      );
    }
  }

  useEffect(() => {
    void loadProviders();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
              الدفع الإلكتروني
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              مزودو الدفع
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              أضف مزودي الدفع الإلكتروني، واضبط مفاتيح الربط و webhook secret. يمكن استخدام مزود تجريبي الآن ثم ربط Moyasar أو Tap لاحقًا.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/payments"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              عمليات الدفع
            </Link>

            <Link
              href="/dashboard/admin/payments/invoices"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              الفواتير
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-lg font-black text-slate-950 dark:text-white">
          إضافة مزود دفع
        </h2>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))}
            placeholder="اسم المزود مثل Moyasar"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <input
            value={form.slug}
            onChange={(event) => setForm((old) => ({ ...old, slug: event.target.value }))}
            placeholder="slug مثل moyasar أو test-provider"
            dir="ltr"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <select
            value={form.mode}
            onChange={(event) => setForm((old) => ({ ...old, mode: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="TEST">TEST</option>
            <option value="LIVE">LIVE</option>
          </select>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((old) => ({ ...old, isActive: event.target.checked }))
              }
            />
            تفعيل المزود
          </label>

          <input
            value={form.publicKey}
            onChange={(event) => setForm((old) => ({ ...old, publicKey: event.target.value }))}
            placeholder="Public Key"
            dir="ltr"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <input
            value={form.secretKey}
            onChange={(event) => setForm((old) => ({ ...old, secretKey: event.target.value }))}
            placeholder="Secret Key"
            dir="ltr"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <input
            value={form.webhookSecret}
            onChange={(event) =>
              setForm((old) => ({ ...old, webhookSecret: event.target.value }))
            }
            placeholder="Webhook Secret"
            dir="ltr"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <input
            value={form.checkoutBaseUrl}
            onChange={(event) =>
              setForm((old) => ({ ...old, checkoutBaseUrl: event.target.value }))
            }
            placeholder="Checkout Base URL اختياري"
            dir="ltr"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <textarea
            value={form.notes}
            onChange={(event) => setForm((old) => ({ ...old, notes: event.target.value }))}
            placeholder="ملاحظات داخلية"
            rows={4}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white md:col-span-2"
          />
        </div>

        <button
          type="button"
          onClick={() => void saveProvider()}
          disabled={isSaving}
          className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          {isSaving ? "جارٍ الحفظ..." : "حفظ مزود الدفع"}
        </button>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-lg font-black text-slate-950 dark:text-white">
          المزودون الحاليون
        </h2>

        {isLoading ? (
          <div className="mt-5 rounded-3xl border border-slate-200 p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            جارٍ التحميل...
          </div>
        ) : providers.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <p className="font-black text-slate-900 dark:text-white">
              لا يوجد مزودو دفع بعد
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-3 py-3 font-black">المزود</th>
                  <th className="px-3 py-3 font-black">Slug</th>
                  <th className="px-3 py-3 font-black">الوضع</th>
                  <th className="px-3 py-3 font-black">Webhook</th>
                  <th className="px-3 py-3 font-black">الحالة</th>
                  <th className="px-3 py-3 font-black">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => {
                  const config = getConfig(provider);

                  return (
                    <tr
                      key={provider.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="px-3 py-4 font-black text-slate-950 dark:text-white">
                        {provider.name}
                      </td>
                      <td className="px-3 py-4 text-slate-600 dark:text-slate-300" dir="ltr">
                        {provider.slug}
                      </td>
                      <td className="px-3 py-4">{config.mode || "TEST"}</td>
                      <td className="px-3 py-4 text-xs" dir="ltr">
                        /api/payments/webhooks/{provider.slug}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={
                            provider.isActive
                              ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                              : "inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          }
                        >
                          {provider.isActive ? "مفعل" : "غير مفعل"}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() => void toggleProvider(provider)}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          {provider.isActive ? "تعطيل" : "تفعيل"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}