import Link from "next/link";
import {
  TEACHIX_SOCIAL_HANDLE,
  TEACHIX_SOCIAL_LINKS,
} from "@/lib/constants/brand";

type PlatformKey = keyof typeof TEACHIX_SOCIAL_LINKS;

function IconFrame({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm ring-1 ring-slate-100 transition-colors duration-300 group-hover:bg-white dark:bg-[#0D1B2E] dark:ring-white/10">
      {children}
    </span>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="url(#teachix-social-ig)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <defs>
        <linearGradient id="teachix-social-ig" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="#F58529" />
          <stop offset="0.5" stopColor="#DD2A7B" />
          <stop offset="1" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="url(#teachix-social-ig)" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .58.05.85.13V9.4a6.33 6.33 0 0 0-5.04 10.4 6.33 6.33 0 0 0 9.53-1.01 6.3 6.3 0 0 0 1.24-3.56V8.3a8.25 8.25 0 0 0 4.53 1.29V6.2c-.1 0-.2.08-.28.11l-.01.01Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <defs>
        <linearGradient id="teachix-social-tg" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="#37AEE2" />
          <stop offset="1" stopColor="#1E96C8" />
        </linearGradient>
      </defs>
      <path
        d="M21.94 4.16 18.9 19.55c-.22 1-.82 1.25-1.67.78l-4.6-3.39-2.22 2.14c-.25.24-.45.45-.92.45l.33-4.66L18.39 6.6c.37-.33-.08-.51-.57-.18L6.6 13.74l-4.52-1.41c-.98-.3-1-1 .2-1.47L20.5 2.83c.82-.3 1.53.18 1.44 1.33Z"
        fill="url(#teachix-social-tg)"
      />
    </svg>
  );
}

function SnapchatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M12.04 2.07c1.7.04 2.7.9 3.32 2.1.27.53.4 1.12.43 1.71.04.84.02 1.68.05 2.52.01.2.1.26.29.24.32-.03.64-.08.96-.1.42-.02.87.06 1.1.43.23.37.1.76-.19 1.03-.32.3-.7.5-1.06.72-.36.22-.49.47-.34.89.42 1.2 1.38 1.9 2.65 2.18.62.14 1.2.18 1.43.84.13.37-.14.71-.52.83-.22.07-.45.09-.67.14-.37.07-.55.32-.42.68.2.55.65.79 1.2.94.34.1.62.25.65.64.04.43-.38.62-.78.7-.61.13-1.23.18-1.84.32-.59.14-.86.56-.98 1.08-.11.52-.34.87-.94.93-.63.06-1.26.01-1.89.02-.36 0-.74.08-.96.4-.4.58-.95.84-1.66.83-.72 0-1.27-.25-1.66-.84-.22-.32-.6-.4-.96-.4-.63-.01-1.26.04-1.89-.03-.6-.05-.83-.4-.94-.92-.12-.52-.39-.94-.98-1.08-.61-.14-1.23-.19-1.84-.32-.4-.08-.74-.27-.78-.7-.03-.39.3-.54.65-.64.55-.15 1-.39 1.2-.94.13-.36-.05-.61-.42-.68-.22-.05-.45-.07-.67-.14-.38-.12-.65-.46-.52-.83.23-.66.81-.7 1.43-.84 1.27-.28 2.23-.98 2.65-2.18.15-.42.02-.67-.34-.89-.36-.22-.74-.42-1.06-.72-.29-.27-.42-.66-.19-1.03.23-.37.68-.45 1.1-.43.32.02.64.07.96.1.19.02.28-.04.29-.24.03-.84.01-1.68.05-2.52.03-.59.16-1.18.43-1.71.62-1.2 1.62-2.06 3.32-2.1Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M23.5 7.2a3 3 0 0 0-2.12-2.13C19.5 4.56 12 4.56 12 4.56s-7.5 0-9.38.51A3 3 0 0 0 .5 7.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 4.8 3 3 0 0 0 2.12 2.13c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3 3 0 0 0 2.12-2.13A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-4.8ZM9.6 15.6V8.4l6.27 3.6-6.27 3.6Z" />
    </svg>
  );
}

const PLATFORM_ICONS: Record<PlatformKey, () => React.ReactNode> = {
  instagram: () => <InstagramIcon />,
  tiktok: () => <TikTokIcon />,
  x: () => <XIcon />,
  telegram: () => <TelegramIcon />,
  snapchat: () => <SnapchatIcon />,
  youtube: () => <YouTubeIcon />,
};

const PLATFORM_ORDER: PlatformKey[] = [
  "instagram",
  "tiktok",
  "x",
  "telegram",
  "snapchat",
  "youtube",
];

export function SocialSection() {
  return (
    <section className="border-t border-slate-100 bg-[#f8fafc] px-5 py-16 dark:border-white/10 dark:bg-[#07111F] sm:px-8 sm:py-20 md:py-24 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black text-sky-600">
            تواصل معنا
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 min-[430px]:text-4xl sm:text-[2.6rem] md:text-5xl lg:text-[3.25rem] xl:text-6xl">
            تابع Teachix في كل مكان
          </h2>

          <p className="mt-6 text-base leading-8 text-slate-500 dark:text-slate-400 sm:text-lg sm:leading-9">
            كن قريبًا من جديد Teachix، وتابع آخر التحديثات والمزايا والمحتوى
            التعليمي عبر منصاتنا الرسمية.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:gap-6">
          {PLATFORM_ORDER.map((key) => {
            const platform = TEACHIX_SOCIAL_LINKS[key];
            const Icon = PLATFORM_ICONS[key];

            return (
              <Link
                key={key}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-4 transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_20px_50px_-32px_rgba(2,132,199,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-[#0D1B2E] dark:hover:border-sky-400/30 sm:p-5"
              >
                <IconFrame>
                  <Icon />
                </IconFrame>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950 dark:text-slate-100 sm:text-base">
                    {platform.name}
                  </p>

                  <p
                    dir="ltr"
                    className="mt-0.5 truncate text-left text-xs font-bold text-slate-400 dark:text-slate-500"
                  >
                    {TEACHIX_SOCIAL_HANDLE}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
