"use client";

import { Send } from "lucide-react";
import { MobilePopCard } from "@/components/mobile/mobile-pop-card";

const TELEGRAM_URL = "https://t.me/teachixsa";

export function TeachixTelegramPopCard({
  open,
  onHandled,
}: {
  open: boolean;
  onHandled: () => void;
}) {
  function join() {
    onHandled();
  }

  return (
    <MobilePopCard
      open={open}
      title="انضم إلى مجتمع Teachix"
      description="تعرّف أكثر على الخدمات المقدمة، التحديثات الجديدة، والنصائح التي تساعدك على الاستفادة من Teachix بشكل أفضل."
      closeLabel="لاحقًا"
      placement="center"
      onClose={onHandled}
    >
      <div className="flex flex-col items-center text-center">
        <div className="grid h-16 w-16 place-items-center rounded-[1.35rem] bg-[#229ED9]/10 text-[#229ED9] ring-1 ring-[#229ED9]/20 dark:bg-[#229ED9]/15 dark:ring-[#229ED9]/30">
          <Send className="h-8 w-8 -rotate-12" aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-black text-sky-600 dark:text-sky-400">
          مجتمع Teachix
        </p>
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={join}
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-[1.35rem] bg-sky-600 px-4 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:shadow-none"
        >
          انضم إلينا على تيليجرام
        </a>
      </div>
    </MobilePopCard>
  );
}
