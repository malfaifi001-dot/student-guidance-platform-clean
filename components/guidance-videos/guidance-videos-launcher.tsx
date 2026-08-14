"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  BookOpenCheck,
  Clapperboard,
  PlayCircle,
  X,
} from "lucide-react";

import { BrandLoader } from "@/components/common/brand-loader";
import { GuidanceVideoPlayerDialog } from "@/components/guidance-videos/guidance-video-player-dialog";
import type { GuidanceVideoPublicDto } from "@/lib/guidance-videos/guidance-video-config";
import {
  completeFeatureTour,
  isFeatureTourCompleted,
} from "@/lib/onboarding/tour-storage";

const GUIDANCE_VIDEOS_INTRO_KEY = "guidance-videos-intro-v1";
const emptySubscribe = () => () => undefined;

export function GuidanceVideosLauncher({ userId }: { userId?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<GuidanceVideoPublicDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [showCoachMark, setShowCoachMark] = useState(false);
  const [selectedVideo, setSelectedVideo] =
    useState<GuidanceVideoPublicDto | null>(null);

  const tourKey = `${GUIDANCE_VIDEOS_INTRO_KEY}:${userId || "browser"}`;

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/guidance-videos", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        videos?: GuidanceVideoPublicDto[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "تعذر تحميل الفيديوهات الإرشادية.",
        );
      }

      const availableVideos = data.videos ?? [];
      setVideos(availableVideos);
      setLoaded(true);

      let introCompleted = false;
      try {
        introCompleted = isFeatureTourCompleted(tourKey);
      } catch {
        // Some privacy modes can deny localStorage access.
      }
      setShowCoachMark(availableVideos.length > 0 && !introCompleted);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل الفيديوهات الإرشادية.",
      );
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [tourKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVideos();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadVideos]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      if (
        event.target instanceof Element &&
        event.target.closest("[data-guidance-videos-panel]")
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isMounted) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted, open]);

  function rememberCoachMark() {
    try {
      completeFeatureTour(tourKey);
    } catch {
      // Dismiss for the current session even if browser storage is unavailable.
    }
    setShowCoachMark(false);
  }

  function openVideos() {
    rememberCoachMark();
    setOpen(true);
    if (!loaded) void loadVideos();
  }

  function closeVideos() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  const panel = (
    <GuidanceVideosPanel
      videos={videos}
      loading={loading}
      error={error}
      onRetry={loadVideos}
      onClose={closeVideos}
      onSelect={(video) => {
        setSelectedVideo(video);
        setOpen(false);
      }}
    />
  );

  return (
    <>
      <div ref={rootRef} className="relative shrink-0">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => (open ? closeVideos() : openVideos())}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200/70 md:h-11 md:w-11 md:rounded-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-sky-300 dark:focus-visible:ring-sky-500/20"
          aria-label="الفيديوهات الإرشادية"
          title="الفيديوهات الإرشادية"
          aria-expanded={open}
          aria-haspopup="dialog"
          data-tour-id="guidance-videos-launcher"
        >
          <Clapperboard className="h-5 w-5" />
          {loaded && videos.length > 0 ? (
            <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-black text-white ring-2 ring-[#f7faff] dark:ring-[#070b18]">
              {videos.length > 99 ? "+99" : videos.length}
            </span>
          ) : null}
        </button>

        {showCoachMark ? (
          <GuidanceVideosCoachMark
            onOpen={openVideos}
            onDismiss={rememberCoachMark}
          />
        ) : null}

        {open ? (
          <div
            className="absolute left-0 top-full z-50 mt-2 hidden w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white/98 shadow-2xl shadow-slate-300/60 backdrop-blur-xl md:block dark:border-slate-800 dark:bg-slate-950/98 dark:shadow-black/50"
            role="dialog"
            aria-label="الفيديوهات الإرشادية"
            data-guidance-videos-panel
          >
            {panel}
          </div>
        ) : null}
      </div>

      {open && isMounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] md:hidden"
              role="presentation"
            >
              <button
                type="button"
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
                onClick={closeVideos}
                aria-label="إغلاق الفيديوهات الإرشادية"
              />
              <div
                className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[min(80dvh,640px)] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-label="الفيديوهات الإرشادية"
                data-guidance-videos-panel
              >
                {panel}
              </div>
            </div>,
            document.body,
          )
        : null}

      <GuidanceVideoPlayerDialog
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}

function GuidanceVideosPanel({
  videos,
  loading,
  error,
  onRetry,
  onClose,
  onSelect,
}: {
  videos: GuidanceVideoPublicDto[];
  loading: boolean;
  error: string;
  onRetry: () => Promise<void>;
  onClose: () => void;
  onSelect: (video: GuidanceVideoPublicDto) => void;
}) {
  return (
    <div className="flex max-h-[min(80dvh,640px)] min-h-0 flex-col" dir="rtl">
      <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
          <Clapperboard className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-slate-950 dark:text-white">
            الفيديوهات الإرشادية
          </h2>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
            شروحات تساعدك على استخدام المنصة وخدماتها.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200/70 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {loading ? (
          <BrandLoader
            variant="inline"
            size="sm"
            label="جاري تحميل الفيديوهات..."
            className="mx-auto my-8"
          />
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl bg-rose-50 p-4 text-center text-xs font-bold leading-6 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
            <button
              type="button"
              onClick={() => void onRetry()}
              className="mt-2 block w-full font-black underline"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : null}

        {!loading && !error && videos.length === 0 ? (
          <div className="py-8 text-center">
            <BookOpenCheck className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-600 dark:text-slate-300">
              لا توجد فيديوهات إرشادية متاحة حاليًا.
            </p>
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="space-y-2">
            {videos.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => onSelect(video)}
                className="flex w-full items-start gap-3 rounded-2xl border border-slate-100 p-3 text-right transition hover:border-sky-200 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200/60 dark:border-slate-800 dark:hover:border-sky-500/30 dark:hover:bg-sky-500/10"
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                  <PlayCircle className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-100">
                    {video.title}
                  </span>
                  {video.description ? (
                    <span className="mt-1 line-clamp-2 block text-xs font-bold leading-5 text-slate-400">
                      {video.description}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GuidanceVideosCoachMark({
  onOpen,
  onDismiss,
}: {
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-x-3 top-[4.6rem] z-[80] rounded-[1.5rem] border border-sky-100 bg-white p-4 text-right shadow-2xl shadow-slate-300/50 md:absolute md:inset-x-auto md:left-0 md:top-full md:mt-4 md:w-[340px] dark:border-sky-500/20 dark:bg-slate-950 dark:shadow-black/40"
      dir="rtl"
      role="status"
    >
      <span className="absolute -top-2 left-[4.15rem] h-4 w-4 rotate-45 border-l border-t border-sky-100 bg-white md:left-4 dark:border-sky-500/20 dark:bg-slate-950" />
      <button
        type="button"
        onClick={onDismiss}
        className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-200"
        aria-label="فهمت"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pl-8">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
          <Clapperboard className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-black text-slate-950 dark:text-white">
            فيديوهات توضيحية عن المنصة
          </h2>
          <p className="mt-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">
            يمكنك مشاهدة الفيديوهات الإرشادية للتعرف على طريقة استخدام خدمات Teachix.
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          فهمت
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-black text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200/70"
        >
          عرض الفيديوهات
        </button>
      </div>
    </div>
  );
}
