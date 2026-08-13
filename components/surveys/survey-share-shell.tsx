"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as QRCode from "qrcode";
import { BrandLoader } from "@/components/common/brand-loader";
import { surveyAudienceLabels } from "@/lib/surveys/survey-config";

type SurveyShareShellProps = {
  surveyId: string;
  boardPath: string;
};

type LoadedSurvey = {
  id: string;
  title: string;
  description?: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  audienceType: string;
  token: string;
  opensAt?: string | null;
  endsAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "غير محدد";
  }

  return date.toLocaleString("ar-SA");
}

function statusLabel(value: string) {
  if (value === "DRAFT") return "مسودة";
  if (value === "PUBLISHED") return "منشور";
  if (value === "CLOSED") return "مغلق";
  if (value === "ARCHIVED") return "مؤرشف";
  return value;
}

export function SurveyShareShell({ surveyId, boardPath }: SurveyShareShellProps) {
  const [survey, setSurvey] = useState<LoadedSurvey | null>(null);
  const [origin, setOrigin] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const publicLink = useMemo(() => {
    if (!origin || !survey?.token) return "";

    return `${origin}/survey/${survey.token}`;
  }, [origin, survey?.token]);

  const whatsappText = useMemo(() => {
    if (!survey || !publicLink) return "";

    return encodeURIComponent(`نأمل منكم تعبئة الاستبيان التالي: ${survey.title}\n${publicLink}`);
  }, [survey, publicLink]);

  async function loadSurvey() {
    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/dashboard/surveys/${surveyId}`, {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    setIsLoading(false);

    if (!response.ok) {
      setError(data?.error || "تعذر تحميل بيانات الاستبيان.");
      return;
    }

    setSurvey(data.survey);
  }

  async function copyLink() {
    if (!publicLink) return;

    await navigator.clipboard.writeText(publicLink);
    setCopied(true);

    window.setTimeout(() => setCopied(false), 1600);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    loadSurvey();
  }, [surveyId]);

  useEffect(() => {
    if (!publicLink) return;

    QRCode.toDataURL(publicLink, {
      margin: 1,
      width: 260,
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [publicLink]);

  if (isLoading) {
    return <BrandLoader variant="section" label="جاري تحميل صفحة المشاركة..." />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
        {error}
      </div>
    );
  }

  if (!survey) {
    return null;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href={boardPath} className="text-sm font-bold text-sky-700">
          العودة إلى مركز الاستبيانات
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">مشاركة الاستبيان</h1>
            <p className="mt-2 text-lg font-bold text-slate-800">{survey.title}</p>

            {survey.description ? (
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{survey.description}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {statusLabel(survey.status)}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                {surveyAudienceLabels[survey.audienceType] || survey.audienceType}
              </span>
            </div>
          </div>

          <Link
            href={`${boardPath}/${surveyId}/analysis`}
            className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-sm font-bold text-sky-700 transition hover:bg-sky-100"
          >
            التحليل
          </Link>
        </div>
      </section>

      {survey.status !== "PUBLISHED" ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-7 text-amber-800">
          الاستبيان غير منشور حاليًا. يمكن تجهيز الرابط و QR الآن، لكن المستفيد لن يستطيع تعبئته إلا بعد النشر وضمن فترة استقبال الردود.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-bold text-slate-950">رابط الاستبيان</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              استخدم هذا الرابط في واتساب أو الرسائل أو أي قناة تواصل مع المستفيدين.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-semibold text-slate-700" dir="ltr">
            {publicLink}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              {copied ? "تم نسخ الرابط" : "نسخ الرابط"}
            </button>

            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-center text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              مشاركة واتساب
            </a>
          </div>

          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-bold text-slate-800">بداية الاستقبال</p>
              <p className="mt-1 text-sm text-slate-500">{formatDate(survey.opensAt)}</p>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">نهاية الاستقبال</p>
              <p className="mt-1 text-sm text-slate-500">{formatDate(survey.endsAt)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="font-bold text-slate-950">QR Code</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            يمكن عرضه أو طباعته للوصول السريع للاستبيان.
          </p>

          <div className="mt-5 flex justify-center rounded-3xl bg-slate-50 p-5">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="h-64 w-64 rounded-2xl bg-white p-2" />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-white text-sm text-slate-400">
                تعذر إنشاء QR
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
