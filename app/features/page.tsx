import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

export default function FeaturesPage() {
  const features = ["Workflow Runtime", "Case Engine", "Noor Import", "Evidence Upload", "Reports", "SaaS Billing Ready"];

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNavbar />
      <main className="container-app py-20">
        <h1 className="text-4xl font-black text-slate-900">مميزات المنصة</h1>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature} className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
              <h2 className="text-xl font-black text-slate-900">{feature}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">ميزة مبنية ضمن معمارية قابلة للتوسع مستقبلًا.</p>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
