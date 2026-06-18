"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildCertificateTitle,
  normalizeCertificateDraft,
  type CertificateDraft,
} from "@/lib/certificates/certificate-copy";

export function CertificatePreviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<CertificateDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = window.sessionStorage.getItem("certificate-draft");

    if (!raw) {
      router.replace("/dashboard/certificates/new");
      return;
    }

    try {
      setDraft(normalizeCertificateDraft(JSON.parse(raw)));
    } catch {
      router.replace("/dashboard/certificates/new");
    }
  }, [router]);

  async function issueCertificate() {
    if (!draft) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/certificates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر إصدار الشهادة.");
      }

      window.sessionStorage.removeItem("certificate-draft");
      router.push("/dashboard/certificates");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إصدار الشهادة.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!draft) {
    return (
      <main className="p-6 text-center text-sm text-slate-500" dir="rtl">
        جاري تجهيز المعاينة...
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 md:p-6" dir="rtl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-700">معاينة الشهادة</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">راجع البيانات قبل الإصدار</h1>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard/certificates/new")}
              className="h-10 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-600"
            >
              تعديل
            </button>
            <button
              type="button"
              onClick={issueCertificate}
              disabled={submitting}
              className="h-10 rounded-full bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? "جاري الإصدار..." : "إصدار الشهادة"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}
      </section>

      <section className="overflow-auto rounded-[2rem] border border-slate-200 bg-slate-100 p-4 shadow-sm">
        <div className="mx-auto aspect-[1.414/1] w-[1123px] max-w-full overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="relative h-full w-full overflow-hidden bg-[#fbfdf9]">
            <div className="absolute inset-x-0 top-0 h-[17%] rounded-b-[45%] bg-[#0f7a57]" />
            <div className="absolute inset-x-0 bottom-0 h-[15%] rounded-t-[45%] bg-[#0f7a57]" />
            <div className="absolute left-[5%] right-[5%] top-[7%] h-[86%] rounded-[2rem] border-4 border-[#d6b15f]" />
            <div className="absolute left-[7%] right-[7%] top-[10%] h-[80%] rounded-[1.5rem] border border-[#0f7a57]/30" />

            <div className="absolute left-[8%] top-[8%] rounded-2xl bg-white/90 px-6 py-4 text-center text-sm font-bold text-[#0f7a57]">
              شعار رؤية 2030
            </div>

            <div className="absolute right-[8%] top-[8%] rounded-2xl bg-white/90 px-6 py-4 text-center text-sm font-bold text-[#0f7a57]">
              شعار وزارة التعليم
            </div>

            <div className="absolute left-1/2 top-[16%] flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full border-4 border-[#d6b15f] bg-[#f7f0d7] text-3xl">
              ✓
            </div>

            <div className="absolute inset-x-[12%] top-[31%] text-center">
              <h2 className="text-4xl font-black text-[#0f7a57]">
                {buildCertificateTitle(draft.certificateType)}
              </h2>
              <div className="mx-auto mt-3 h-1 w-72 rounded-full bg-[#d6b15f]" />

              <p className="mt-8 text-lg text-slate-700">
                تتقدم إدارة المدرسة بخالص الشكر والتقدير إلى
              </p>

              <h3 className="mt-6 text-5xl font-black text-slate-950">
                {draft.recipientName}
              </h3>

              <p className="mx-auto mt-8 max-w-3xl text-xl leading-10 text-slate-700">
                {draft.body}
              </p>

              {draft.reason ? (
                <p className="mt-5 text-base text-slate-500">{draft.reason}</p>
              ) : null}
            </div>

            <div className="absolute bottom-[12%] left-[9%] w-52 text-center">
              <p className="text-sm font-bold text-slate-700">الموجه / رائد النشاط</p>
              <div className="mt-5 h-0.5 bg-[#0f7a57]" />
              <p className="mt-3 text-xs text-slate-500">{draft.issuerName || "حسب الحساب"}</p>
            </div>

            <div className="absolute bottom-[12%] right-[9%] w-52 text-center">
              <p className="text-sm font-bold text-slate-700">مدير المدرسة</p>
              <div className="mt-5 h-0.5 bg-[#0f7a57]" />
              <p className="mt-3 text-xs text-slate-500">{draft.principalName || "غير محدد"}</p>
            </div>

            <div className="absolute bottom-[13%] left-1/2 -translate-x-1/2 text-center text-sm text-slate-500">
              <p>تاريخ الإصدار: {draft.issueDate}</p>
              <p className="mt-2 text-xs text-slate-400">رقم الشهادة ينشأ بعد الإصدار</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}