import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { dashboardServices } from "@/lib/constants/services";

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNavbar />
      <main className="container-app py-20">
        <h1 className="text-4xl font-black text-slate-900">خدمات المنصة</h1>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {dashboardServices.map((service) => (
            <div key={service.slug} className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
              <p className="text-sm font-bold text-sky-700">{service.kind === "workflow" ? "خدمة Workflow" : "خدمة مستقلة"}</p>
              <h2 className="mt-3 text-xl font-black text-slate-900">{service.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">{service.description}</p>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
