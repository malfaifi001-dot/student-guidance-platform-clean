import {
  TEACHIX_ANDROID_APK_URL,
  TEACHIX_APP_STORE_URL,
} from "@/lib/marketing/app-downloads";

export function HomeAppDownloadsSection() {
  return (
    <section
      dir="rtl"
      className="border-y border-slate-100 bg-slate-50/70 px-5 py-12 dark:border-white/10 dark:bg-[#07111F] sm:px-8 sm:py-16 lg:px-10"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <p className="text-center text-sm font-black text-sky-600 dark:text-sky-400">
          تطبيقات Teachix
        </p>
        <h2 className="mt-3 text-center text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">
          تجد Teachix على
        </h2>

        <div className="mt-8 grid w-full max-w-3xl grid-cols-2 items-center justify-items-center gap-4 sm:gap-20 lg:gap-24">
          <a
            href={TEACHIX_APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="فتح صفحة Teachix على App Store"
            className="inline-flex min-h-24 w-full items-center justify-center rounded-2xl p-1 outline-none transition duration-200 hover:scale-[1.04] hover:opacity-85 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-[#07111F]"
          >
            <img
              src="/brand/apps/app-store-badge.svg"
              alt="Teachix على App Store"
              className="h-auto w-full max-w-[300px]"
            />
          </a>

          <a
            href={TEACHIX_ANDROID_APK_URL}
            download="teachix-android.apk"
            aria-label="تحميل تطبيق Teachix للأندرويد"
            className="inline-flex min-h-24 w-full items-center justify-center rounded-2xl p-1 outline-none transition duration-200 hover:scale-[1.04] hover:opacity-85 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-[#07111F]"
          >
            <img
              src="/brand/apps/android-icon.svg"
              alt="تطبيق Teachix للأندرويد"
              className="h-[170px] w-auto max-w-full"
            />
          </a>
        </div>
      </div>
    </section>
  );
}
