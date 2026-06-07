import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNavbar />
      <main className="container-app py-20">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 card-shadow">
          <h1 className="text-4xl font-black text-slate-900">سياسة الخصوصية</h1>
          <p className="mt-6 text-lg leading-9 text-slate-600">سياسة الخصوصية ستفصل لاحقًا آلية حماية بيانات الطلاب والمدارس والمرفقات.</p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
