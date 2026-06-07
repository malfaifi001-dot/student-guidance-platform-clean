import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNavbar />
      <main className="container-app py-20">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 card-shadow">
          <p className="text-sm font-bold text-sky-700">تواصل معنا</p>
          <h1 className="mt-4 text-4xl font-black text-slate-900">نحن قريبون منك</h1>
          <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-600">
            هذه الصفحة جاهزة لاحقًا لربط نموذج التواصل، واتساب، البريد، ونظام الدعم.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
