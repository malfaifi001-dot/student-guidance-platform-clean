"use client";

import { useEffect, useState } from "react";
import { TeachixAppDownloadPopCard } from "@/components/apps/teachix-app-download-card";

const APP_DOWNLOAD_POP_SEEN_KEY = "teachix-app-download-pop-seen";

export function TeachixAppDownloadPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(APP_DOWNLOAD_POP_SEEN_KEY) === "true") return;

    setOpen(true);
  }, []);

  function close() {
    window.sessionStorage.setItem(APP_DOWNLOAD_POP_SEEN_KEY, "true");
    setOpen(false);
  }

  return <TeachixAppDownloadPopCard open={open} onClose={close} />;
}

