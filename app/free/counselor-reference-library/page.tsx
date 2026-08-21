import type { Metadata } from "next";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { PublicReferenceLibraryShell } from "@/components/reference-library/public-reference-library-shell";
import {
  buildAnonymousReferenceLibraryBreadcrumbs,
  listAnonymousReferenceLibraryItems,
} from "@/lib/reference-library/reference-library-anonymous-service";

export const metadata: Metadata = {
  title: "المكتبة الشاملة للموجه الطلابي مجانًا",
  description: "نماذج وأدلة وحقائب وملفات جاهزة للوصول والتحميل مجانًا.",
};

export default async function PublicCounselorReferenceLibraryPage() {
  const [items, breadcrumbs] = await Promise.all([
    listAnonymousReferenceLibraryItems({ parentId: null }),
    buildAnonymousReferenceLibraryBreadcrumbs(null),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" dir="rtl">
      <MarketingNavbar />
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <header className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-sm font-black text-sky-600">أداة مجانية من Teachix</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">المكتبة الشاملة للموجه الطلابي</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-bold leading-7 text-slate-500 sm:text-base">نماذج وأدلة وحقائب وملفات جاهزة للوصول والتحميل مجانًا.</p>
        </header>
        <PublicReferenceLibraryShell initialItems={items || []} initialBreadcrumbs={breadcrumbs} />
      </main>
      <MarketingFooter />
    </div>
  );
}
