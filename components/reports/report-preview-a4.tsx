
"use client";

import Link from "next/link";
import { ReportEvidenceGallery } from "./report-evidence-gallery";
type Props = {
  report: {
    id: string;
    title: string;
    editableContent: string;
    renderedContent: string | null;
    status: string;
    evidenceEnabled: boolean;
    evidenceItems: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      caption: string | null;
      visible: boolean;
    }>;
    caseEntry: {
      service: {
        name: string;
      };
      student: {
        fullName: string;
      } | null;
    };
  };
};

export function ReportPreviewA4({ report }: Props) {
  return (
    <main className="min-h-screen bg-slate-100 p-8 print:bg-white">
      <div className="mx-auto mb-6 flex max-w-4xl justify-end gap-3 print:hidden">
        <Link
          href={`/dashboard/report/${report.id}/studio`}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          تعديل / إعادة فتح
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          Export PDF
        </button>
      </div>

      <article className="mx-auto min-h-[1123px] max-w-4xl bg-white p-14 shadow-2xl print:shadow-none">
        <header className="mb-10 border-b border-slate-200 pb-6 text-center">
          <div className="text-sm font-black text-slate-500">
            شعار وزارة التعليم
          </div>

          <h1 className="mt-6 text-3xl font-black text-slate-900">
            {report.title}
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            {report.caseEntry.service.name}
          </p>
        </header>

        <section className="prose prose-slate max-w-none whitespace-pre-line text-right text-lg leading-[2.7rem] text-slate-800">
          {report.renderedContent || report.editableContent}
        </section>

        {report.evidenceEnabled ? (
          <ReportEvidenceGallery items={report.evidenceItems} />
        ) : null}
      </article>
    </main>
  );
}