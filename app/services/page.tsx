import type { Metadata } from "next";
import {
  BarChart3,
  CheckCircle2,
  FileText,
  FolderCheck,
  GraduationCap,
  Paperclip,
  School,
  Trophy,
  UsersRound,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

const servicesDescription =
  "تعرّف على خدمات Teachix المخصصة لمدير المدرسة والمعلم والموجه الطلابي ورائد النشاط، مع خدمات وتقارير وصلاحيات واضحة لكل دور.";

export const metadata: Metadata = {
  title: "خدمات المنصة",
  description: servicesDescription,
  alternates: {
    canonical: "https://teachix.sa/services",
  },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "https://teachix.sa/services",
    title: "خدمات Teachix لفريق المدرسة",
    description: servicesDescription,
  },
};

const roleServices = [
  {
    role: "الموجه الطلابي",
    description: "خدمات مخصصة لتنظيم أعمال التوجيه الطلابي ومتابعتها وتوثيقها.",
    icon: UsersRound,
    services: ["متابعة الطلاب", "الخدمات الإرشادية", "التواصل بين الأسرة والمدرسة", "البرامج الإرشادية", "اللجان والاجتماعات", "الاستبيانات", "تحليل النتائج", "التقارير"],
  },
  {
    role: "المعلم",
    description: "أدوات تساعد المعلم على تنظيم أعماله التعليمية وإنجازه المهني.",
    icon: GraduationCap,
    services: ["ملف الإنجاز", "الشواهد", "التقارير", "الشهادات", "الاستبيانات", "تحليل النتائج", "الأعمال التعليمية", "بيانات الطلاب"],
  },
  {
    role: "رائد النشاط",
    description: "مساحة لتنظيم برامج النشاط وتنفيذها وتوثيق المشاركات والنتائج.",
    icon: Trophy,
    services: ["برامج النشاط", "تكليفات التنفيذ", "المشاركات", "الشواهد", "ملف الإنجاز", "الاستبيانات", "التقارير"],
  },
  {
    role: "مدير المدرسة",
    description: "خدمات إدارية تدعم متابعة أعمال المدرسة وملفاتها وتقاريرها.",
    icon: School,
    services: ["متابعة الأعمال المدرسية", "ملف المدرسة", "متابعة المعلمين", "ملف الإنجاز", "التقارير", "الجدول الدراسي", "التقييم المدرسي"],
  },
];

const sharedServices = [
  { title: "التقارير", icon: FileText },
  { title: "ملفات الإنجاز", icon: FolderCheck },
  { title: "الاستبيانات", icon: CheckCircle2 },
  { title: "تحليل النتائج", icon: BarChart3 },
  { title: "الشواهد والمرفقات", icon: Paperclip },
  { title: "بيانات الطلاب", icon: UsersRound },
];

export default function ServicesPage() {
  return (
    <div dir="rtl" className="marketing-public min-h-screen bg-white text-slate-950 transition-colors duration-300 dark:bg-[#07111F] dark:text-slate-100">
      <MarketingNavbar />

      <main>
        <section className="border-b border-slate-100 bg-gradient-to-b from-sky-50/80 to-white px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-4xl">
              <p className="text-sm font-black text-sky-600">خدمات Teachix</p>
              <h1 className="mt-5 text-4xl font-black leading-[1.2] tracking-[-0.035em] sm:text-5xl lg:text-6xl">خدمات مدرسية منظمة حول مسؤولية كل دور.</h1>
              <p className="mt-7 max-w-3xl text-lg leading-9 text-slate-600 sm:text-xl sm:leading-10">
                تمنح Teachix مدير المدرسة والمعلم والموجه الطلابي ورائد النشاط مساحات مستقلة، بحيث يعمل كل مستخدم ضمن الخدمات والصلاحيات المرتبطة بمسؤولياته.
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-2">
              {roleServices.map(({ role, description, icon: Icon, services }) => (
                <article key={role} className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.32)] sm:p-9">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black">{role}</h2>
                      <p className="mt-2 leading-7 text-slate-600">{description}</p>
                    </div>
                  </div>

                  <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                    {services.map((service) => (
                      <li key={service} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                        {service}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50 px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-sky-600">خدمات مشتركة</p>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">أدوات تتكرر حيث يحتاجها الدور</h2>
              <p className="mt-5 text-lg leading-9 text-slate-600">
                تتوفر بعض الأدوات عبر أكثر من دور وفق طبيعة العمل والصلاحيات، مع بقاء بيانات كل مساحة وخدماتها منفصلة وواضحة.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sharedServices.map(({ title, icon: Icon }) => (
                <div key={title} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-black text-slate-800">{title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
