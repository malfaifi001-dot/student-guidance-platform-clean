"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { TeachixAppDownloadPrompt } from "@/components/apps/teachix-app-download-prompt";
import { TeachixTelegramPopCard } from "@/components/social/teachix-telegram-pop-card";

const TELEGRAM_DISMISSED_KEY = "teachix-telegram-pop-dismissed";
const TELEGRAM_DASHBOARD_PAGES_KEY = "teachix-telegram-dashboard-pages";
const REQUIRED_DASHBOARD_PAGES = 4;

function readVisitedPages() {
  try {
    const value = window.sessionStorage.getItem(TELEGRAM_DASHBOARD_PAGES_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function DashboardPostLoginPopCards() {
  const pathname = usePathname();
  const [appOpen, setAppOpen] = useState(true);
  const [telegramEligible, setTelegramEligible] = useState(false);
  const [telegramHandled, setTelegramHandled] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(TELEGRAM_DISMISSED_KEY) === "1") {
        setTelegramHandled(true);
        return;
      }
    } catch {
      // Continue with the current visit when localStorage is unavailable.
    }

    if (!pathname.startsWith("/dashboard")) return;

    const pages = readVisitedPages();
    if (!pages.includes(pathname)) {
      pages.push(pathname);
      try {
        window.sessionStorage.setItem(
          TELEGRAM_DASHBOARD_PAGES_KEY,
          JSON.stringify(pages),
        );
      } catch {
        // The in-memory eligibility state still works for this visit.
      }
    }

    if (pages.length >= REQUIRED_DASHBOARD_PAGES) {
      setTelegramEligible(true);
    }
  }, [pathname]);

  const handleTelegram = useCallback(() => {
    try {
      window.localStorage.setItem(TELEGRAM_DISMISSED_KEY, "1");
    } catch {
      // Close for this visit when persistent storage is unavailable.
    }
    setTelegramHandled(true);
  }, []);

  return (
    <>
      <TeachixAppDownloadPrompt onOpenChange={setAppOpen} />
      <TeachixTelegramPopCard
        open={telegramEligible && !telegramHandled && !appOpen}
        onHandled={handleTelegram}
      />
    </>
  );
}
