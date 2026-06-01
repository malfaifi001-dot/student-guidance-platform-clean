"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { GuardianSummonsOfficialDocument } from "@/components/guardian-summons/guardian-summons-official-document";
export default function GuardianSummonsOfficialPreviewPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-950">
      <div className="no-print mx-auto mb-5 flex max-w-[210mm] items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            معاينة استدعاء ولي أمر
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            هذا هو شكل النموذج الرسمي المختصر عند الطباعة أو التصدير PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            رجوع
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            <Printer className="h-4 w-4" />
            طباعة / PDF
          </button>
        </div>
      </div>

      <GuardianSummonsOfficialDocument
        schoolName="................"
        educationRegion="................"
        educationOffice="................"
        hijriYear="١٤٤٦"
        guardianName="........................................"
        studentName="................"
        summonsDay="................"
        summonsDate="................"
        summonsTime="................"
        periodLabel="صباحًا"
        counselorName="................"
        principalName="................"
        showLogo={false}
        reasons={[
          {
            id: "absence",
            label: "غيابه المتكرر لأكثر من خمسة أيام بدون عذر.",
            selected: true,
          },
          {
            id: "late-arrival",
            label: "تأخره الصباحي المتكرر لأكثر من خمسة أيام بدون عذر.",
            selected: false,
          },
          {
            id: "academic-weakness",
            label: "ضعف التحصيل الدراسي.",
            selected: false,
          },
          {
            id: "behavior",
            label: "وجود مشكلة سلوكية.",
            selected: false,
          },
        ]}
      />
    </main>
  );
}