import { MessageCircle } from "lucide-react";

import { buildTeachixSupportWhatsAppUrl } from "@/lib/marketing/contact-details";

export function SupportHelpPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6" dir="rtl">
      <header>
        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">Teachix</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
          الدعم والمساعدة
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-500 dark:text-slate-300">
          يسعدنا مساعدتك والإجابة عن استفساراتك. تواصل معنا عبر واتساب وسنكون قريبين منك.
        </p>
      </header>

      <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm dark:border-emerald-400/20 dark:bg-slate-900 sm:p-8">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
            <MessageCircle className="h-8 w-8" strokeWidth={2.1} aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
            نحن هنا لمساعدتك
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-slate-500 dark:text-slate-300">
            أرسل استفسارك أو طلب المساعدة، وسيتواصل معك فريق الدعم عبر واتساب.
          </p>
          <a
            href={buildTeachixSupportWhatsAppUrl()}
            target="_blank"
            rel="noreferrer"
            title="التواصل مع الدعم عبر واتساب"
            aria-label="التواصل مع الدعم عبر واتساب"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 sm:w-auto"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            تواصل معنا عبر واتساب
          </a>
        </div>
      </section>
    </main>
  );
}
