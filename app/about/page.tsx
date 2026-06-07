import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNavbar />
      <main className="container-app py-20">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 card-shadow">
          <p className="text-sm font-bold text-sky-700">عن المنصة</p>
          <h1 className="mt-4 text-4xl font-black text-slate-900">منصة التوجيه الطلابي</h1>
          <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-600">
            منصة مدرسية حديثة تساعد الموجه والموجهة الطلابية على إدارة الخدمات، الحالات،
            الشواهد، التقارير، وبيانات الطلاب من خلال بنية Workflow Runtime قابلة للتوسع.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
