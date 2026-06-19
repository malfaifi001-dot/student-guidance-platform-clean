"use client";

import Link from "next/link";

import { MobileAppShell } from "@/components/mobile/mobile-app-shell";
import { MobileIcon, type MobileIconName } from "@/components/mobile/mobile-icons";

type NewCaseService = {
  slug: string;
  title: string;
  icon: MobileIconName;
};

const services: NewCaseService[] = [
  {
    slug: "guidance-programs",
    title: "البرامج الإرشادية",
    icon: "spark",
  },
  {
    slug: "committees-meetings",
    title: "اللجان والاجتماعات",
    icon: "users",
  },
  {
    slug: "student-follow-up",
    title: "متابعة الطلاب",
    icon: "check",
  },
  {
    slug: "student-guidance-services",
    title: "الخدمات الإرشادية",
    icon: "file",
  },
  {
    slug: "family-school-communication",
    title: "التواصل الأسري",
    icon: "users",
  },
  {
    slug: "guardian-summons",
    title: "استدعاء ولي أمر",
    icon: "bell",
  },
  {
    slug: "appreciation-certificates",
    title: "شهادات التقدير",
    icon: "shield",
  },
  {
    slug: "assessment-center",
    title: "مركز التحليل",
    icon: "chart",
  },
];

function IconBox({ icon }: { icon: MobileIconName }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-sky-700 ring-1 ring-sky-100">
      <MobileIcon name={icon} className="h-5 w-5" />
    </span>
  );
}

function ServiceCard({ service }: { service: NewCaseService }) {
  return (
    <Link
      href={`/mobile/counselor/${service.slug}/new`}
      className="flex min-h-[7.8rem] flex-col justify-between rounded-[1.45rem] bg-white/82 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]"
    >
      <IconBox icon={service.icon} />

      <span className="text-sm font-black leading-6 text-slate-950">
        {service.title}
      </span>
    </Link>
  );
}

export function MobileNewCaseServices() {
  return (
    <MobileAppShell activeSection="cases">
      <div className="space-y-4">
        <section className="mobile-hero-card-dark relative overflow-hidden rounded-[1.8rem] p-4">
          <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-sky-200/70 blur-2xl" />
          <div className="absolute -bottom-16 right-10 h-36 w-36 rounded-full bg-cyan-100/80 blur-2xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-sky-700">حالة جديدة</p>
              <h1 className="mt-1 text-[1.65rem] font-black leading-tight tracking-tight">
                اختر الخدمة
              </h1>
            </div>

            <IconBox icon="plus" />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2.5">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </section>

        <Link
          href="/mobile/counselor/cases"
          className="flex h-11 items-center justify-center rounded-2xl bg-sky-50 text-sm font-black text-sky-700 ring-1 ring-sky-100"
        >
          الرجوع للحالات
        </Link>
      </div>
    </MobileAppShell>
  );
}