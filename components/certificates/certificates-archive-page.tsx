"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CERTIFICATE_RECIPIENT_TYPES,
  CERTIFICATE_TYPES,
  getCertificateTypeLabel,
} from "@/lib/certificates/certificate-types";

type CertificateArchiveItem = {
  id: string;
  certificateNumber: string;
  certificateType: string;
  recipientType: string;
  recipientName: string;
  reason?: string | null;
  title: string;
  issueDate: string;
  status: string;
  pdfUrl?: string | null;
  createdAt: string;
};

export function CertificatesArchivePage() {
  const [items, setItems] = useState<CertificateArchiveItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [recipientType, setRecipientType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const search = new URLSearchParams();

    if (query.trim()) search.set("query", query.trim());
    if (type) search.set("type", type);
    if (recipientType) search.set("recipientType", recipientType);

    return search.toString();
  }, [query, type, recipientType]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/dashboard/certificates?${params}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "تعذر تحميل الشهادات.");
        }

        if (!ignore) {
          setItems(data.items || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "تعذر تحميل الشهادات.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [params]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 md:p-6" dir="rtl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-700">الشهادات والتكريم</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">الشهادات المصدرة</h1>
            <p className="mt-2 text-sm text-slate-500">بحث، فلترة، واستعراض الشهادات الصادرة.</p>
          </div>

          <Link
            href="/dashboard/certificates/new"
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            + إنشاء شهادة شكر
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1.3fr_0.8fr_0.8fr]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالاسم أو رقم الشهادة أو السبب..."
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
          />

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
          >
            <option value="">كل أنواع الشهادات</option>
            {CERTIFICATE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={recipientType}
            onChange={(event) => setRecipientType(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
          >
            <option value="">كل المستفيدين</option>
            {CERTIFICATE_RECIPIENT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="font-black text-slate-950">الأرشيف</h2>
            <p className="mt-1 text-xs text-slate-500">{total} شهادة</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">جاري تحميل الشهادات...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🏅</div>
            <h3 className="font-bold text-slate-950">لا توجد شهادات بعد</h3>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              ابدأ بإنشاء شهادة شكر، وبعد الإصدار ستظهر هنا مباشرة.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 p-5 transition hover:bg-slate-50 md:grid-cols-[1.4fr_0.9fr_0.8fr_0.7fr]"
              >
                <div>
                  <p className="font-bold text-slate-950">{item.recipientName}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.certificateNumber}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {getCertificateTypeLabel(item.certificateType)}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.reason || "بدون سبب"}</p>
                </div>

                <div className="text-sm text-slate-600">
                  {new Date(item.issueDate).toLocaleDateString("ar-SA")}
                </div>

                <div className="flex items-center gap-2 md:justify-end">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    صادرة
                  </span>
                  <button
                    type="button"
                    disabled
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-400"
                  >
                    PDF لاحقًا
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}