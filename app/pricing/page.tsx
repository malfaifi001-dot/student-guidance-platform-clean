import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

export default function PricingPage() {
  const plans = [
    { name: "مجاني", price: "0 ريال", desc: "للتجربة والاستخدام الأساسي." },
    { name: "مدرسي", price: "لاحقًا", desc: "للمدارس والموجهين مع تقارير متقدمة." },
    { name: "احترافي", price: "لاحقًا", desc: "اشتراكات، صلاحيات، تصدير، وربط خارجي." },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNavbar />
      <main className="container-app py-20">
        <h1 className="text-4xl font-black text-slate-900">الخطط والأسعار</h1>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-[2rem] border border-slate-200 bg-white p-8 card-shadow">
              <h2 className="text-2xl font-black text-slate-900">{plan.name}</h2>
              <p className="mt-4 text-3xl font-black text-sky-700">{plan.price}</p>
              <p className="mt-4 text-sm leading-7 text-slate-500">{plan.desc}</p>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
