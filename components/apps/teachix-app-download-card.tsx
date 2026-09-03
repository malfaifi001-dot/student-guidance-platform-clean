"use client";

import { Download, Smartphone } from "lucide-react";
import { MobilePopCard } from "@/components/mobile/mobile-pop-card";
import {
  TEACHIX_ANDROID_APK_URL,
  TEACHIX_APP_STORE_URL,
} from "@/lib/marketing/app-downloads";

function AppDownloadTargets({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid grid-cols-2 items-center gap-3" : "grid grid-cols-2 items-center gap-4 sm:gap-8"}>
      <a
        href={TEACHIX_APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="فتح صفحة Teachix على App Store"
        className="flex min-h-16 items-center justify-center rounded-xl p-1 outline-none transition hover:scale-[1.03] hover:opacity-85 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
      >
        <img
          src="/brand/apps/app-store-badge.svg"
          alt="Teachix على App Store"
          className="h-auto w-full max-w-[220px]"
        />
      </a>
      <a
        href={TEACHIX_ANDROID_APK_URL}
        download="teachix-android.apk"
        aria-label="تحميل تطبيق Teachix للأندرويد"
        className="flex min-h-16 items-center justify-center rounded-xl p-1 outline-none transition hover:scale-[1.03] hover:opacity-85 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
      >
        <img
          src="/brand/apps/android-icon.svg"
          alt="تطبيق Teachix للأندرويد"
          className={compact ? "h-20 w-auto max-w-full" : "h-28 w-auto max-w-full"}
        />
      </a>
    </div>
  );
}

export function TeachixAppDownloadCard() {
  return (
    <section
      dir="rtl"
      className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm dark:border-sky-400/20 dark:bg-slate-900 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20">
          <Smartphone className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-black text-sky-600 dark:text-sky-400">تطبيق Teachix</p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">خذ Teachix معك</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500 dark:text-slate-300">
            حمّل تطبيق Teachix على جوالك للوصول إلى خدماتك بسهولة أينما كنت.
          </p>
        </div>
      </div>
      <div className="mt-5">
        <AppDownloadTargets compact />
      </div>
    </section>
  );
}

export function TeachixAppDownloadPopCard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <MobilePopCard
      open={open}
      title="خذ Teachix معك"
      description="حمّل تطبيق Teachix على جوالك للوصول إلى خدماتك بسهولة أينما كنت."
      closeLabel="لاحقًا"
      placement="center"
      onClose={onClose}
    >
      <AppDownloadTargets compact />
    </MobilePopCard>
  );
}
