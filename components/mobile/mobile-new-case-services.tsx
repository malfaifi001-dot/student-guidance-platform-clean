"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    title: "برامج التوجيه الطلابي",
    icon: "spark",
  },
  {
    slug: "committees-meetings",
    title: "اللجان والاجتماعات",
    icon: "users",
  },
  {
    slug: "student-follow-up",
    title: "متابعة الطلبة والمواقف اليومية الطارئة",
    icon: "check",
  },
  {
    slug: "student-guidance-services",
    title: "خدمات التوجيه الطلابي",
    icon: "file",
  },
  {
    slug: "family-school-communication",
    title: "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
    icon: "users",
  },
  {
    slug: "guardian-summons",
    title: "إشعار ولي الأمر",
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
      className="flex min-h-[5.8rem] items-center gap-2.5 rounded-[1.45rem] bg-white/82 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]"
    >
      <IconBox icon={service.icon} />

      <span className="min-w-0 text-sm font-black leading-5 text-slate-950">
        {service.title}
      </span>
    </Link>
  );
}

export function MobileNewCaseServices() {
  const pages = Array.from({ length: Math.ceil(services.length / 4) }, (_, pageIndex) =>
    services.slice(pageIndex * 4, pageIndex * 4 + 4),
  );

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

        <section className="relative space-y-2.5" aria-label="Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/85 text-sky-600 shadow-sm ring-1 ring-sky-100">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/85 text-sky-600 shadow-sm ring-1 ring-sky-100">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex snap-x snap-mandatory gap-3">
              {pages.map((page, pageIndex) => {
                const columns = [page.slice(0, 2), page.slice(2, 4)];

                return (
                  <div key={`services-page-${pageIndex}`} className="grid w-full shrink-0 snap-start grid-cols-2 gap-2.5">
                    {columns.map((column, columnIndex) => (
                      <div key={`services-column-${pageIndex}-${columnIndex}`} className="space-y-2.5">
                        {column.map((service) => (
                          <ServiceCard key={service.slug} service={service} />
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
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
