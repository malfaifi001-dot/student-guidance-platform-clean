"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  FileText,
  PencilLine,
} from "lucide-react";
import {
  getCertificateTypeLabel,
} from "@/lib/certificates/certificate-types";
import { CertificateTemplatePreview } from "@/components/certificates/certificate-template-preview";

type CertificateDraft = {
  templateKey: string;
  recipientType: string;
  recipientName: string;
  studentId?: string | null;
  nationalId?: string;
  grade?: string;
  classroom?: string;
  certificateType: string;
  reason: string;
  body: string;
  issueDate: string;
  principalName?: string;
  issuerName?: string;
};

const DRAFT_STORAGE_KEY = "certificate-draft";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "غير محدد";
  }

  return date.toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function CertificatePreviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<CertificateDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);

      if (!raw) {
        setDraft(null);
        return;
      }

      setDraft(JSON.parse(raw) as CertificateDraft);
    } catch {
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, []);

  async function issueCertificate() {
    if (!draft || issuing) return;

    setIssuing(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/certificates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      const text = await response.text();
      let result: any = {};

      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = {
          error: text || `HTTP ${response.status}`,
        };
      }

      if (!response.ok) {
        throw new Error(result?.details || result?.error || "تعذر إصدار الشهادة.");
      }

      window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      router.push("/dashboard/certificates");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إصدار الشهادة.");
    } finally {
      setIssuing(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-7" dir="rtl">
        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-black text-slate-500">جاري تحميل المعاينة...</p>
        </section>
      </main>
    );
  }

  if (!draft) {
    return (
      <main className="space-y-7" dir="rtl">
        <section className="rounded-[2.5rem] border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-100">
            <FileText className="h-7 w-7" />
          </div>

          <h1 className="mt-4 text-2xl font-black text-slate-950">
            لا توجد مسودة شهادة
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-slate-500">
            ارجع لصفحة الإنشاء وأدخل بيانات الشهادة أولًا.
          </p>

          <Link
            href="/dashboard/certificates/new"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <ArrowRight className="h-4 w-4" />
            إنشاء شهادة
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-8 text-white shadow-xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-black text-sky-100">Certificates Runtime</p>
            <h1 className="mt-3 text-4xl font-black">معاينة الشهادة</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              راجع بيانات الشهادة، ثم اضغط إصدار عند التأكد.
            </p>
          </div>

          <Link
            href="/dashboard/certificates/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
          >
            <PencilLine className="h-4 w-4" />
            تعديل البيانات
          </Link>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-sky-700">المعاينة النهائية</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                معاينة التصميم المختار
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[2rem] bg-slate-100 p-4">
            <CertificateTemplatePreview data={draft} />
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black text-sky-700">جاهزية الإصدار</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              تأكيد الشهادة
            </h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">المستفيد</p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {draft.recipientName}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">نوع الشهادة</p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {getCertificateTypeLabel(draft.certificateType)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">التاريخ</p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {formatDate(draft.issueDate)}
                </p>
              </div>
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700 ring-1 ring-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={issueCertificate}
              disabled={issuing}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {issuing ? "جاري الإصدار..." : "إصدار الشهادة"}
            </button>

            <Link
              href="/dashboard/certificates/new"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <PencilLine className="h-4 w-4" />
              تعديل
            </Link>
          </section>

          <section className="rounded-[2rem] border border-sky-100 bg-sky-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-sky-100">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-sky-950">بعد الإصدار</p>
                <p className="mt-1 text-xs font-bold leading-6 text-sky-700">
                  ستنتقل الشهادة للأرشيف، ويمكن عرضها أو تحميلها PDF.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
