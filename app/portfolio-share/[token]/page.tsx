import { notFound } from "next/navigation";

import { PortfolioSharedPreview } from "@/components/portfolio/portfolio-shared-preview";
import { getPublicPortfolioSnapshotShare } from "@/lib/portfolio/portfolio-snapshot-share-service";

export const dynamic = "force-dynamic";

export default async function PublicPortfolioSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getPublicPortfolioSnapshotShare(token);
  if (!share) notFound();

  return (
    <main dir="rtl" className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-slate-100 px-2 py-3 sm:px-4 sm:py-10">
      <style>{`@media print { .portfolio-share-chrome { display:none !important; } body { background:#fff !important; } .portfolio-share-page { padding:0 !important; } }`}</style>
      <section className="portfolio-share-chrome mx-auto mb-4 w-full max-w-[900px] rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:mb-6 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black text-sky-700">Teachix</p>
            <h1 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">ملف الإنجاز المهني</h1>
            <p className="mt-2 break-words text-base font-black leading-7 text-slate-800 sm:text-lg">{share.document.portfolio.title}</p>
            <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-600">{share.document.owner.name} · {share.document.owner.jobTitle}</p>
            <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-500">{share.document.school.name}</p>
          </div>
          <div className="w-full rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold leading-6 text-sky-800 sm:w-auto sm:min-w-[180px]">
            <p>العام: {share.document.portfolio.academicYear || share.document.school.academicYear || "غير محدد"}</p>
            <p className="mt-1">الفصل: {share.document.portfolio.term || share.document.school.currentSemester || "غير محدد"}</p>
          </div>
        </div>
        <p className="mt-5 text-sm font-bold leading-7 text-slate-500">نسخة محفوظة للقراءة والمشاركة فقط.</p>
      </section>
      <PortfolioSharedPreview data={share.document} />
    </main>
  );
}
