import type { Metadata } from "next";
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileBadge2,
  FileText,
  FolderCheck,
  ListChecks,
  Paperclip,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

const featuresDescription =
  "اكتشف مميزات Teachix لتنظيم الأعمال المدرسية والتقارير وملفات الإنجاز والشواهد والاستبيانات وتحليل النتائج وفق دور كل مستخدم وصلاحياته.";

export const metadata: Metadata = {
  title: "مميزات المنصة",
  description: featuresDescription,
  alternates: {
    canonical: "https://teachix.sa/features",
  },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "https://teachix.sa/features",
    title: "مميزات Teachix للعمل المدرسي",
    description: featuresDescription,
  },
};

const features = [
  { title: "تنظيم الأعمال المدرسية", description: "مساحات واضحة تساعد كل دور على ترتيب أعماله اليومية ومتابعة ما تم إنجازه.", icon: ClipboardList },
  { title: "التقارير", description: "تحويل البيانات والأعمال الموثقة إلى تقارير منظمة يسهل الرجوع إليها.", icon: FileText },
  { title: "ملفات الإنجاز", description: "جمع الأعمال والشواهد في ملفات إنجاز مرتبة تعكس ما تم تنفيذه.", icon: FolderCheck },
  { title: "الشواهد والمرفقات", description: "إضافة الملفات والصور والمستندات وربطها مباشرة بالعمل الذي توثقه.", icon: Paperclip },
  { title: "الاستبيانات", description: "إنشاء الاستبيانات وجمع الردود ضمن تجربة سهلة وواضحة للمستخدم.", icon: ListChecks },
  { title: "تحليل النتائج", description: "قراءة النتائج وعرضها بصورة منظمة تدعم المتابعة واتخاذ الإجراء المناسب.", icon: BarChart3 },
  { title: "بيانات الطلاب", description: "رفع بيانات الطلاب وتنظيمها لتكون متاحة في الخدمات المرتبطة بصلاحية المستخدم.", icon: UsersRound },
  { title: "الشهادات", description: "إعداد الشهادات المرتبطة بالأعمال والمشاركات وحفظها بصورة منظمة.", icon: FileBadge2 },
  { title: "تجربة مستقلة حسب الدور والصلاحيات", description: "خدمات ومساحات عمل تتوافق مع مسؤوليات مدير المدرسة والمعلم والموجه الطلابي ورائد النشاط.", icon: ShieldCheck },
  { title: "نماذج وخطوات عمل مرنة", description: "خطوات واضحة تتكيف مع طبيعة كل خدمة وتساعد المستخدم على استكمال البيانات المطلوبة.", icon: SlidersHorizontal },
];

const journey = ["إنجاز العمل", "حفظ البيانات", "إضافة الشواهد", "المتابعة والمراجعة", "إصدار التقرير"];

export default function FeaturesPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-white text-slate-950">
      <MarketingNavbar />

      <main>
        <section className="border-b border-slate-100 bg-gradient-to-b from-sky-50/80 to-white px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-4xl">
              <p className="text-sm font-black text-sky-600">مميزات Teachix</p>
              <h1 className="mt-5 text-4xl font-black leading-[1.2] tracking-[-0.035em] sm:text-5xl lg:text-6xl">كل ما يحتاجه العمل المدرسي، بصورة أوضح.</h1>
              <p className="mt-7 max-w-3xl text-lg leading-9 text-slate-600 sm:text-xl sm:leading-10">
                تساعد Teachix فريق المدرسة على تنظيم الأعمال والبيانات والشواهد والتقارير، مع تجربة مستقلة تناسب دور كل مستخدم وصلاحياته.
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ title, description, icon: Icon }) => (
                <article key={title} className="rounded-[26px] border border-slate-200 bg-white p-7 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.3)] transition duration-300 hover:-translate-y-1 hover:border-sky-200">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-6 text-xl font-black">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50 px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-sky-600">من البداية إلى التقرير</p>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">خطوات مفهومة تحفظ سياق العمل</h2>
              <p className="mt-5 text-lg leading-9 text-slate-600">ترافق Teachix المستخدم في مسار واضح، بحيث تبقى البيانات والشواهد والمتابعة مرتبطة بالعمل نفسه.</p>
            </div>

            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {journey.map((step, index) => (
                <li key={step} className="relative rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-black text-white">{index + 1}</span>
                    <span className="font-black text-slate-800">{step}</span>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-5 text-slate-700">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-sky-600" />
              <p className="leading-7">تختلف النماذج والخطوات بحسب الخدمة والدور، بينما تبقى التجربة العامة بسيطة ومتسقة.</p>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
