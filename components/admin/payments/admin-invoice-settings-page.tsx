"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InvoiceSettings = {
  id: string;
  sellerName: string;
  sellerDomain: string | null;
  sellerCountry: string | null;
  sellerAddress: string | null;
  commercialRegistration: string | null;
  taxNumber: string | null;
  vatEnabled: boolean;
  vatRate: number;
  invoicePrefix: string;
  invoiceNote: string | null;
};

const emptySettings: InvoiceSettings = {
  id: "",
  sellerName: "Teachix",
  sellerDomain: "smstudents.com",
  sellerCountry: "المملكة العربية السعودية",
  sellerAddress: "",
  commercialRegistration: "",
  taxNumber: "",
  vatEnabled: false,
  vatRate: 0,
  invoicePrefix: "INV",
  invoiceNote:
    "تم إصدار هذه الفاتورة آليًا من مركز المدفوعات في Teachix.",
};

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className="text-sm font-black text-slate-900 dark:text-white">{label}</span>
      {help ? (
        <span className="mt-1 block text-xs leading-6 text-slate-500 dark:text-slate-400">
          {help}
        </span>
      ) : null}
      <div className="mt-3">{children}</div>
    </label>
  );
}

export function AdminInvoiceSettingsPage() {
  const [settings, setSettings] = useState<InvoiceSettings>(emptySettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField<K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function loadSettings() {
    setIsLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch("/api/dashboard/admin/payments/invoice-settings", {
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل إعدادات الفواتير.");
      }

      setSettings({
        ...emptySettings,
        ...payload.settings,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء تحميل الإعدادات."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/dashboard/admin/payments/invoice-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر حفظ إعدادات الفواتير.");
      }

      setSettings({
        ...emptySettings,
        ...payload.settings,
      });
      setMessage(payload.message || "تم حفظ إعدادات الفواتير بنجاح.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء حفظ الإعدادات."
      );
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
              إعدادات مالية
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              إعدادات الفواتير والضريبة
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              تحكم في بيانات الجهة، الرقم الضريبي، السجل التجاري، نسبة الضريبة، وبادئة أرقام الفواتير.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/payments"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              العودة للمدفوعات
            </Link>

            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={isLoading || isSaving}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {isSaving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </button>
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

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          جارٍ تحميل إعدادات الفواتير...
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          <Field label="اسم الجهة المصدرة">
            <input
              value={settings.sellerName}
              onChange={(event) => updateField("sellerName", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </Field>

          <Field label="دومين المنصة">
            <input
              value={settings.sellerDomain || ""}
              onChange={(event) => updateField("sellerDomain", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </Field>

          <Field label="الدولة">
            <input
              value={settings.sellerCountry || ""}
              onChange={(event) => updateField("sellerCountry", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </Field>

          <Field label="العنوان">
            <input
              value={settings.sellerAddress || ""}
              onChange={(event) => updateField("sellerAddress", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </Field>

          <Field label="السجل التجاري">
            <input
              value={settings.commercialRegistration || ""}
              onChange={(event) =>
                updateField("commercialRegistration", event.target.value)
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </Field>

          <Field label="الرقم الضريبي">
            <input
              value={settings.taxNumber || ""}
              onChange={(event) => updateField("taxNumber", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </Field>

          <Field
            label="تفعيل الضريبة"
            help="عند التفعيل يتم احتساب الضريبة ضمن مبلغ العملية المدفوع، بحيث يبقى الإجمالي مطابقًا للمبلغ المحصل."
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.vatEnabled}
                onChange={(event) => updateField("vatEnabled", event.target.checked)}
                className="h-5 w-5"
              />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                تفعيل ضريبة القيمة المضافة
              </span>
            </div>
          </Field>

          <Field label="نسبة الضريبة">
            <input
              type="number"
              min={0}
              max={100}
              value={settings.vatRate}
              onChange={(event) => updateField("vatRate", Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </Field>

          <Field label="بادئة رقم الفاتورة" help="مثال: INV أو SMS. ستظهر مثل INV-202606-000001.">
            <input
              value={settings.invoicePrefix}
              onChange={(event) => updateField("invoicePrefix", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </Field>

          <Field label="ملاحظة الفاتورة">
            <textarea
              value={settings.invoiceNote || ""}
              onChange={(event) => updateField("invoiceNote", event.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </Field>
        </section>
      )}
    </div>
  );
}
