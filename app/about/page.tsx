import type { Metadata } from "next";
import {
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FolderCheck,
  GraduationCap,
  School,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

const aboutDescription =
  "تعرّف على Teachix، المنصة المدرسية الرقمية التي تجمع أعمال مدير المدرسة والمعلم والموجه الطلابي ورائد النشاط في مساحة واحدة منظمة.";

export const metadata: Metadata = {
  title: "عن المنصة",
  description: aboutDescription,
  alternates: {
    canonical: "https://teachix.sa/about",
  },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "https://teachix.sa/about",
    title: "عن Teachix | منصة مدرسية رقمية متكاملة",
    description: aboutDescription,
  },
};

const roles = [
  {
    title: "مدير المدرسة",
    description: "متابعة الأعمال المدرسية والتقارير وملفات المدرسة من مساحة إدارية واضحة.",
    icon: School,
  },
  {
    title: "المعلم",
    description: "تنظيم الأعمال التعليمية وملف الإنجاز والشواهد والتقارير المرتبطة بعمله.",
    icon: GraduationCap,
  },
  {
    title: "الموجه الطلابي / الموجهة الطلابية",
    description: "إدارة المتابعة والخدمات والبرامج الإرشادية وتوثيقها بصورة منظمة.",
    icon: UsersRound,
  },
  {
    title: "رائد النشاط",
    description: "تنظيم برامج النشاط والتكليفات والمشاركات والشواهد وملفات الإنجاز.",
    icon: Trophy,
  },
];

const capabilities = [
  "إنجاز الأعمال",
  "توثيقها ومتابعتها",
  "حفظ الشواهد والمرفقات",
  "إصدار التقارير",
];

export default function AboutPage() {
  return (
    <div dir="rtl" className="marketing-public min-h-screen bg-white text-slate-950 transition-colors duration-300 dark:bg-[#07111F] dark:text-slate-100">
      <MarketingNavbar />

      <main>
        <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-sky-50/80 to-white px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-32">
          <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-sky-100/70 blur-3xl" />
          <div className="relative mx-auto max-w-7xl">
            <div className="max-w-4xl">
              <p className="text-sm font-black text-sky-600">من هي Teachix؟</p>
              <h1 className="mt-5 text-4xl font-black leading-[1.2] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                منصة مدرسية رقمية متكاملة
                <span className="mt-2 block text-sky-600">لفريق المدرسة.</span>
              </h1>
              <p className="mt-7 max-w-3xl text-lg leading-9 text-slate-600 sm:text-xl sm:leading-10">
                تجمع <span className="font-black text-slate-950">Teachix</span> أعمال مدير المدرسة والمعلم والموجه الطلابي أو الموجهة الطلابية ورائد النشاط في مكان واحد؛ لتساعد كل دور على إنجاز أعماله وتوثيقها ومتابعتها وحفظ شواهدها وإصدار تقاريرها بوضوح.
              </p>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((capability) => (
                <div key={capability} className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-white/90 px-5 py-4 shadow-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600" />
                  <span className="font-bold text-slate-700">{capability}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-sky-600">لمن صُممت المنصة؟</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.025em] sm:text-4xl">تجربة عملية لكل دور في المدرسة</h2>
              <p className="mt-5 text-lg leading-9 text-slate-600">
                صُممت Teachix حول مسؤوليات الأدوار المدرسية الفعلية، مع إبقاء حدود كل دور واضحة دون خلط أعمال الإدارة أو التعليم أو التوجيه الطلابي أو النشاط.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {roles.map(({ title, description, icon: Icon }) => (
                <article key={title} className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.28)] sm:p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-xl font-black text-slate-950">{title}</h3>
                  <p className="mt-3 leading-8 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50 px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div>
              <p className="text-sm font-black text-sky-600">أقل تشتتًا، وأكثر وضوحًا</p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.025em] sm:text-4xl">من الملفات المتفرقة إلى مساحة عمل واحدة</h2>
              <p className="mt-6 text-lg leading-9 text-slate-600">
                بدل توزيع العمل بين ملفات ونماذج وأدوات منفصلة، تربط Teachix البيانات والخطوات والشواهد بالتكليف أو الخدمة ذاتها. يصبح الرجوع إلى ما أُنجز ومراجعته وإعداد تقريره أكثر تنظيمًا لفريق المدرسة.
              </p>
            </div>

            <div className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-[0_30px_70px_-45px_rgba(2,132,199,0.4)] sm:p-8">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "العمل", icon: BriefcaseBusiness },
                  { label: "التوثيق", icon: FolderCheck },
                  { label: "التقرير", icon: ClipboardCheck },
                ].map(({ label, icon: Icon }, index) => (
                  <div key={label} className="relative rounded-2xl bg-slate-50 p-5 text-center">
                    <Icon className="mx-auto h-6 w-6 text-sky-600" />
                    <p className="mt-3 font-black">{label}</p>
                    {index < 2 && <span className="absolute -left-3 top-1/2 hidden h-px w-6 bg-sky-200 sm:block" />}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-sky-50 p-5 text-sky-950">
                <Sparkles className="mt-1 h-5 w-5 shrink-0 text-sky-600" />
                <p className="leading-7">تظل البيانات والشواهد مرتبطة بالعمل منذ بدايته حتى إصدار التقرير.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl rounded-[30px] border border-sky-100 bg-sky-50/60 p-8 sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-16 lg:p-16">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-sky-600">لكل دور مساحته</p>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">خدمات وصلاحيات وتجربة مستقلة</h2>
              <p className="mt-5 text-lg leading-9 text-slate-600">
                يرى كل مستخدم ما يرتبط بدوره ومسؤولياته فقط، ويعمل ضمن خدماته وخطواته وصلاحياته المخصصة، مع الحفاظ على تجربة موحدة وسهلة داخل Teachix.
              </p>
            </div>
            <div className="mt-8 shrink-0 rounded-2xl bg-white px-6 py-5 text-center shadow-sm lg:mt-0">
              <p className="text-2xl font-black text-sky-600">مكان واحد</p>
              <p className="mt-1 text-sm font-bold text-slate-500">وتجربة مناسبة لكل دور</p>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
