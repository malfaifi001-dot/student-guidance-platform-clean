"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, PlayCircle, X } from "lucide-react";

import { GuidanceVideoPlayer } from "@/components/guidance-videos/guidance-video-player";
import type { GuidanceVideoPlayable } from "@/lib/guidance-videos/guidance-video-config";

export function GuidanceVideoPlayerDialog({
  video,
  onClose,
}: {
  video: GuidanceVideoPlayable | null;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const playerRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!video) return;
    const player = playerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (player) {
        player.pause();
        player.currentTime = 0;
      }
    };
  }, [onClose, video]);

  if (!mounted || !video) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guidance-video-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="إغلاق مشغل الفيديو"
      />
      <section className="relative z-10 max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white p-4 shadow-2xl sm:p-6 dark:border-slate-700 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sky-600 dark:text-sky-300">
              {video.mediaType === "IMAGE" ? (
                <ImageIcon className="h-5 w-5" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )}
              <span className="text-xs font-black">
                {video.mediaType === "IMAGE" ? "صورة إرشادية" : "فيديو إرشادي"}
              </span>
            </div>
            <h2
              id="guidance-video-title"
              className="text-xl font-black text-slate-950 sm:text-2xl dark:text-white"
            >
              {video.title}
            </h2>
            {video.description ? (
              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">
                {video.description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm dark:border-slate-700">
          <div className="aspect-video w-full">
            <GuidanceVideoPlayer video={video} uploadedPlayerRef={playerRef} />
          </div>
        </div>

        <footer className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white transition hover:bg-sky-700"
          >
            إغلاق
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
