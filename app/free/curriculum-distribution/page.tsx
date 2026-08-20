import type { Metadata } from "next";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { PublicCurriculumDistributionTool } from "@/components/curriculum-distribution/public-curriculum-distribution-tool";

export const metadata: Metadata = {
  title: "توزيع المنهج مجانًا",
  description: "اختر المرحلة والصف والمادة واحصل على توزيع منهج جاهز للمعاينة والطباعة مجانًا.",
};

export default async function PublicCurriculumDistributionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const ref = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const campaignRef = String(ref || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" dir="rtl">
      <MarketingNavbar />
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <header className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-sm font-black text-sky-600">أداة مجانية من Teachix</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">حمّل توزيع منهجك مجانًا</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-bold leading-8 text-slate-500 sm:text-base">
            اختر المرحلة والصف والمادة واحصل على توزيع جاهز للمعاينة والطباعة، دون تسجيل دخول.
          </p>
        </header>
        <PublicCurriculumDistributionTool campaignRef={campaignRef} />
      </main>
      <MarketingFooter />
    </div>
  );
}
