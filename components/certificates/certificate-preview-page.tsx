"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  PencilLine,
} from "lucide-react";
import { CertificateTemplatePreview } from "@/components/certificates/certificate-template-preview";
import { CertificateWizardActionRow } from "@/components/certificates/certificate-wizard-action-row";
import { CertificateWizardNavigation } from "@/components/certificates/certificate-wizard-navigation";
import { CERTIFICATE_DRAFT_STORAGE_KEY } from "@/components/certificates/new-certificate-form";

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
  introText?: string;
  bodyText?: string;
  issueDate: string;
  principalName?: string;
  issuerName?: string;
};

type CertificateSignatureProfile = {
  principalName: string;
  principalSignatureUrl: string;
  issuerName: string;
  issuerTitle: string;
  issuerSignatureUrl: string;
};

const LEGACY_DRAFT_STORAGE_KEY = "certificate-draft";

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
  const [signatureProfile, setSignatureProfile] = useState<CertificateSignatureProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = window.localStorage.getItem(CERTIFICATE_DRAFT_STORAGE_KEY)
          || window.sessionStorage.getItem(LEGACY_DRAFT_STORAGE_KEY);
        if (!raw) {
          if (!cancelled) setDraft(null);
          return;
        }

        if (!cancelled) setDraft(JSON.parse(raw) as CertificateDraft);

        const response = await fetch("/api/dashboard/certificates/signature-profile", {
          cache: "no-store",
        });
        const text = await response.text();
        const result = text ? JSON.parse(text) : {};
        if (!cancelled && response.ok) {
          setSignatureProfile(result.profile || null);
        }
      } catch {
        if (!cancelled) setSignatureProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
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

      window.localStorage.removeItem(CERTIFICATE_DRAFT_STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
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
      <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-4 text-white shadow-xl sm:rounded-[2.5rem] sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-black text-sky-100">Certificates Runtime</p>
            <h1 className="mt-3 text-2xl font-black sm:text-4xl">معاينة الشهادة</h1>
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

      <CertificateWizardNavigation currentStep={3} onStepSelect={(step) => router.push(`/dashboard/certificates/new?step=${step}`)} />

      <section className="w-full rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2.5rem] sm:p-6">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2.5rem] sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-sky-700">المعاينة النهائية</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                معاينة التصميم المختار
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[2rem] bg-slate-100 p-4">
            <CertificateTemplatePreview
              data={{
                ...draft,
                issuerName: signatureProfile?.issuerName || draft.issuerName,
                issuerTitle: signatureProfile?.issuerTitle,
                issuerSignatureUrl: signatureProfile?.issuerSignatureUrl,
                principalName: signatureProfile?.principalName || draft.principalName,
                principalSignatureUrl: signatureProfile?.principalSignatureUrl,
              }}
            />
          </div>
        </div>
        {error ? (
          <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <CertificateWizardActionRow
            primaryLabel={issuing ? "جاري الإصدار..." : "إصدار الشهادة"}
            onPrimary={issueCertificate}
            primaryDisabled={issuing}
            primaryIcon={<CheckCircle2 className="h-4 w-4" />}
            secondaryLabel="السابق"
            onSecondary={() => router.push("/dashboard/certificates/new?step=2")}
          />
        </div>
      </section>
    </main>
  );
}
