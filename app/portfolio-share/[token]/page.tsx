import { notFound } from "next/navigation";

import { PortfolioPrintDocument } from "@/components/portfolio/print/portfolio-print-document";
import { getPublicPortfolioSnapshotShare } from "@/lib/portfolio/portfolio-snapshot-share-service";

export const dynamic = "force-dynamic";

export default async function PublicPortfolioSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getPublicPortfolioSnapshotShare(token);
  if (!share) notFound();

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 py-6 sm:py-10">
      <style>{`@media print { .portfolio-share-chrome { display:none !important; } body { background:#fff !important; } .portfolio-share-page { padding:0 !important; } }`}</style>
      <section className="portfolio-share-chrome mx-auto mb-6 w-full max-w-[900px] rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black text-sky-700">Teachix</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">ملف الإنجاز المهني</h1>
            <p className="mt-2 text-lg font-black text-slate-800">{share.document.portfolio.title}</p>
            <p className="mt-2 text-sm font-bold text-slate-600">{share.document.owner.name} · {share.document.owner.jobTitle}</p>
            <p className="mt-1 text-sm font-bold text-slate-500">{share.document.school.name}</p>
          </div>
          <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
            <p>العام: {share.document.portfolio.academicYear || share.document.school.academicYear || "غير محدد"}</p>
            <p className="mt-1">الفصل: {share.document.portfolio.term || share.document.school.currentSemester || "غير محدد"}</p>
          </div>
        </div>
        <p className="mt-5 text-sm font-bold leading-7 text-slate-500">نسخة محفوظة للقراءة والمشاركة فقط.</p>
      </section>
      <div className="portfolio-share-page mx-auto w-full max-w-[900px] overflow-hidden">
        <PortfolioPrintDocument data={share.document} />
      </div>
    </main>
  );
}
