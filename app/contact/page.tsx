import type { Metadata } from "next";

import { ContactForm } from "@/components/marketing/contact-form";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

export const metadata: Metadata = {
  title: "تواصل معنا | Teachix",
  description:
    "تواصل مع فريق Teachix للاستفسارات والدعم الفني والحسابات وطلبات الخصوصية.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingNavbar />

      <main>
        <section className="border-b border-slate-100 px-5 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-sky-600">
                تواصل معنا
              </p>

              <h1 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
                كيف يمكننا مساعدتك؟
              </h1>


            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <ContactForm />
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}