"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, BookOpenCheck, ChevronLeft, PlayCircle, Video } from "lucide-react";

import { BrandLoader } from "@/components/common/brand-loader";
import { GuidanceVideoPlayerDialog } from "@/components/guidance-videos/guidance-video-player-dialog";
import type { GuidanceVideoPublicDto } from "@/lib/guidance-videos/guidance-video-config";

export function GuidanceVideosLauncher({ notificationCount = 4 }: { notificationCount?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "videos">("menu");
  const [videos, setVideos] = useState<GuidanceVideoPublicDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<GuidanceVideoPublicDto | null>(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/guidance-videos", { cache: "no-store" });
      const data = (await response.json()) as { videos?: GuidanceVideoPublicDto[]; error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تحميل الفيديوهات الإرشادية.");
      setVideos(data.videos ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل الفيديوهات الإرشادية.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function openVideos() {
    setView("videos");
    void loadVideos();
  }

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setView("menu");
          }}
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-sky-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-sky-300"
          aria-label="الإشعارات"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 ? (
            <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
              {notificationCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <div
            className="absolute left-0 top-full z-50 mt-2 w-[min(90vw,360px)] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white/98 shadow-2xl shadow-slate-300/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/98 dark:shadow-black/50"
            dir="rtl"
            role="dialog"
            aria-label={view === "menu" ? "الإشعارات" : "الفيديوهات الإرشادية"}
          >
            {view === "menu" ? (
              <div className="p-3">
                <div className="flex items-center gap-3 border-b border-slate-100 px-2 pb-3 dark:border-slate-800">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-slate-950 dark:text-white">الإشعارات</p>
                    <p className="text-xs font-bold text-slate-400">الوصول السريع للمساعدة</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openVideos}
                  className="mt-2 flex w-full items-center gap-3 rounded-2xl p-3 text-right transition hover:bg-sky-50 dark:hover:bg-sky-500/10"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                    <Video className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-800 dark:text-slate-100">الفيديوهات الإرشادية</span>
                    <span className="mt-1 block text-xs font-bold text-slate-400">شروحات استخدام منصة Teachix</span>
                  </span>
                  <ChevronLeft className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            ) : (
              <div>
                <header className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
                  <button type="button" onClick={() => setView("menu")} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300" aria-label="العودة">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="font-black text-slate-950 dark:text-white">الفيديوهات الإرشادية</h2>
                    <p className="text-xs font-bold text-slate-400">اختر فيديو لبدء المشاهدة</p>
                  </div>
                </header>
                <div className="max-h-[min(60vh,430px)] overflow-y-auto p-3">
                  {loading ? <BrandLoader variant="inline" size="sm" label="جاري تحميل الفيديوهات..." className="mx-auto my-8" /> : null}
                  {!loading && error ? (
                    <div className="rounded-2xl bg-rose-50 p-4 text-center text-xs font-bold leading-6 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                      {error}
                      <button type="button" onClick={() => void loadVideos()} className="mt-2 block w-full font-black underline">إعادة المحاولة</button>
                    </div>
                  ) : null}
                  {!loading && !error && videos.length === 0 ? (
                    <div className="py-8 text-center">
                      <BookOpenCheck className="mx-auto h-9 w-9 text-slate-300" />
                      <p className="mt-3 text-sm font-black text-slate-600 dark:text-slate-300">لا توجد فيديوهات إرشادية متاحة حاليًا.</p>
                    </div>
                  ) : null}
                  {!loading && !error ? (
                    <div className="space-y-2">
                      {videos.map((video) => (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => {
                            setSelectedVideo(video);
                            setOpen(false);
                          }}
                          className="flex w-full items-start gap-3 rounded-2xl border border-slate-100 p-3 text-right transition hover:border-sky-200 hover:bg-sky-50 dark:border-slate-800 dark:hover:border-sky-500/30 dark:hover:bg-sky-500/10"
                        >
                          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"><PlayCircle className="h-5 w-5" /></span>
                          <span className="min-w-0">
                            <span className="block text-sm font-black text-slate-800 dark:text-slate-100">{video.title}</span>
                            {video.description ? <span className="mt-1 line-clamp-2 block text-xs font-bold leading-5 text-slate-400">{video.description}</span> : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
      <GuidanceVideoPlayerDialog video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </>
  );
}
