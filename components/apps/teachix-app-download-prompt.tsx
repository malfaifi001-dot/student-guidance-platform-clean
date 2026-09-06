"use client";

import { useEffect, useState } from "react";
import { TeachixAppDownloadPopCard } from "@/components/apps/teachix-app-download-card";

const APP_DOWNLOAD_POP_DISMISSED_KEY = "teachix-app-download-pop-dismissed";

export function TeachixAppDownloadPrompt({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (
        window.localStorage.getItem(APP_DOWNLOAD_POP_DISMISSED_KEY) === "1"
      ) {
        onOpenChange?.(false);
        return;
      }
    } catch {
      // Show the prompt normally when browser storage is unavailable.
    }

    setOpen(true);
    onOpenChange?.(true);
  }, [onOpenChange]);

  function close() {
    try {
      window.localStorage.setItem(APP_DOWNLOAD_POP_DISMISSED_KEY, "1");
    } catch {
      // The prompt still closes for this visit when persistent storage is unavailable.
    }
    setOpen(false);
    onOpenChange?.(false);
  }

  return <TeachixAppDownloadPopCard open={open} onClose={close} />;
}
