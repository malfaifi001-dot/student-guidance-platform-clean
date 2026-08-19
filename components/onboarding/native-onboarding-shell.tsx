"use client";

import {
  Activity,
  Award,
  BarChart3,
  ClipboardCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  PenLine,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  completeNativeOnboarding,
  closeNativeOnboardingReview,
  getNativeStartupDecision,
  hasCompletedNativeOnboarding,
  NATIVE_ONBOARDING_REVIEW_EVENT,
  NATIVE_STARTUP_READY_EVENT,
} from "@/lib/native/native-onboarding";
import { isNativeCapacitor } from "@/lib/native/native-runtime";
import { logNativeRuntimeDiagnostic } from "@/lib/native/native-runtime-diagnostics";

type IconComponent = typeof LayoutDashboard;

type Slide = {
  title: string;
  description: string;
  visual: "dashboard" | "services" | "hub";
};

const slides: Slide[] = [
  {
    title: "مرحبًا بك في Teachix",
    description: "منصة مدرسية رقمية متكاملة تجمع أعمالك وخدماتك في مكان واحد.",
    visual: "dashboard",
  },
  {
    title: "أنجز أعمالك بسهولة",
    description: "تابع أعمالك، وثّق إنجازاتك، وأنشئ تقاريرك من تجربة واحدة منظمة.",
    visual: "services",
  },
  {
    title: "كل خدمات المدرسة في تطبيق واحد",
    description:
      "من التقارير والاستبيانات إلى الشهادات والتوقيعات والأنشطة — كل ما تحتاجه في Teachix.",
    visual: "hub",
  },
];

const serviceCards: Array<{ label: string; icon: IconComponent }> = [
  { label: "الحالات والمتابعة", icon: ClipboardCheck },
  { label: "التقارير", icon: FileText },
  { label: "الشواهد", icon: Award },
  { label: "ملف الإنجاز", icon: FolderKanban },
  { label: "التكليفات", icon: ListChecks },
];

const hubCards: Array<{ label: string; icon: IconComponent }> = [
  { label: "الاستبيانات", icon: ClipboardCheck },
  { label: "الشهادات", icon: Award },
  { label: "التوقيعات", icon: PenLine },
  { label: "الأنشطة", icon: Activity },
  { label: "التحليل", icon: BarChart3 },
];

function Illustration({ kind }: { kind: Slide["visual"] }) {
  if (kind === "dashboard") {
    return (
      <div className="relative mx-auto h-64 w-full max-w-sm" aria-hidden="true">
        <div className="absolute inset-x-7 top-7 rounded-[2rem] border border-blue-200/70 bg-white p-4 shadow-2xl shadow-blue-950/10 dark:border-white/10 dark:bg-[#102138]">
          <div className="flex items-center justify-between">
            <span className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
            <span className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/20" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <span className="h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/15" />
            <span className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <span className="h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15" />
          </div>
          <div className="mt-4 h-3 w-3/4 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="absolute bottom-7 left-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#0D1B2E]">
          <FileText className="h-8 w-8 text-sky-600" />
        </div>
        <div className="absolute right-3 top-2 rounded-2xl border border-blue-100 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#0D1B2E]">
          <LayoutDashboard className="h-8 w-8 text-sky-600" />
        </div>
      </div>
    );
  }

  const cards = kind === "services" ? serviceCards : hubCards;

  return (
    <div className="relative mx-auto flex h-64 w-full max-w-sm items-center justify-center" aria-hidden="true">
      <div className="z-10 grid h-24 w-24 place-items-center rounded-[2rem] bg-sky-600 shadow-2xl shadow-sky-950/25">
        <div className="h-12 w-12 rounded-full border-[5px] border-white/95" />
      </div>
      {cards.map(({ label, icon: Icon }, index) => {
        const positions = [
          "-left-1 top-8",
          "right-0 top-1",
          "-right-2 bottom-5",
          "left-6 bottom-0",
          "left-1 top-28",
        ];

        return (
          <div
            key={label}
            className={`absolute ${positions[index]} flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-lg dark:border-white/10 dark:bg-[#102138]`}
          >
            <Icon className="h-4 w-4 shrink-0 text-sky-600" />
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function isDeepLinkStartupEvent(event: Event): boolean {
  const detail = (event as CustomEvent<{ deepLinkHandled?: boolean }>).detail;
  return detail?.deepLinkHandled === true;
}

export function NativeOnboardingShell() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"startup" | "review">("startup");
  const [slideIndex, setSlideIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!isNativeCapacitor()) return;

    const onReviewRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: "open" | "close" }>).detail;
      if (detail?.action === "open") {
        setMode("review");
        setSlideIndex(0);
        setVisible(true);
        logNativeRuntimeDiagnostic("native-onboarding-review-opened", { coldStart: false });
      } else if (detail?.action === "close") {
        setVisible(false);
        setMode("startup");
        logNativeRuntimeDiagnostic("native-onboarding-review-closed", { coldStart: false });
      }
    };

    window.addEventListener(NATIVE_ONBOARDING_REVIEW_EVENT, onReviewRequest);

    const decide = (deepLinkHandled: boolean) => {
      if (deepLinkHandled) {
        setVisible(false);
        logNativeRuntimeDiagnostic("native-onboarding-bypassed-for-deep-link", {
          coldStart: true,
        });
        return;
      }

      if (hasCompletedNativeOnboarding()) {
        setVisible(false);
        return;
      }

      setVisible(true);
      logNativeRuntimeDiagnostic("native-onboarding-shown", { coldStart: true });
    };

    const onStartupReady = (event: Event) => decide(isDeepLinkStartupEvent(event));
    window.addEventListener(NATIVE_STARTUP_READY_EVENT, onStartupReady);

    const startupDecision = getNativeStartupDecision();
    if (startupDecision) decide(startupDecision.deepLinkHandled);

    return () => {
      window.removeEventListener(NATIVE_STARTUP_READY_EVENT, onStartupReady);
      window.removeEventListener(NATIVE_ONBOARDING_REVIEW_EVENT, onReviewRequest);
    };
  }, []);

  if (!visible || !isNativeCapacitor()) return null;

  const slide = slides[slideIndex];
  const isLast = slideIndex === slides.length - 1;

  const goToSlide = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    if (boundedIndex === slideIndex) return;
    setSlideIndex(boundedIndex);
    logNativeRuntimeDiagnostic("native-onboarding-slide-changed", {
      slide: boundedIndex + 1,
      coldStart: true,
    });
  };

  const completeAndNavigate = (path?: "/login" | "/register") => {
    if (mode === "review") {
      closeNativeOnboardingReview();
      return;
    }

    completeNativeOnboarding();
    setVisible(false);
    logNativeRuntimeDiagnostic("native-onboarding-completed", { coldStart: true });
    if (path) router.push(path);
  };

  const skip = () => {
    if (mode === "review") {
      closeNativeOnboardingReview();
      return;
    }

    completeNativeOnboarding();
    setVisible(false);
    logNativeRuntimeDiagnostic("native-onboarding-skipped", { coldStart: true });
  };

  return (
    <section
      dir="rtl"
      aria-label="مقدمة Teachix"
      className="fixed inset-0 z-[950] overflow-y-auto bg-slate-50 text-slate-950 dark:bg-[#07111F] dark:text-slate-100"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const deltaX = event.changedTouches[0]?.clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(deltaX) < 45) return;
        goToSlide(deltaX > 0 ? slideIndex + 1 : slideIndex - 1);
      }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-5 py-4">
        <div className="flex flex-1 -translate-y-6 flex-col justify-center py-4">
          <div className="transition-opacity duration-200" key={slide.visual}>
            <Illustration kind={slide.visual} />
            <div className="mx-auto mt-2 max-w-md text-center">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{slide.title}</h1>
              <p className="mx-auto mt-4 max-w-sm text-sm font-bold leading-8 text-slate-600 dark:text-slate-300">
                {slide.description}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 pb-8">
          <div className="flex justify-center gap-2" aria-label={`الشريحة ${slideIndex + 1} من ${slides.length}`}>
            {slides.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`الانتقال إلى الشريحة ${index + 1}`}
                aria-current={index === slideIndex ? "step" : undefined}
                className={`h-2.5 rounded-full transition-all duration-200 ${index === slideIndex ? "w-8 bg-sky-600" : "w-2.5 bg-slate-300 dark:bg-slate-700"}`}
              />
            ))}
          </div>

          {isLast ? (
            <div className="grid gap-3">
              {mode === "review" ? (
                <button
                  type="button"
                  onClick={() => closeNativeOnboardingReview()}
                  className="min-h-12 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 dark:ring-offset-[#07111F]"
                >
                  ابدأ الآن
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => completeAndNavigate("/login")}
                className={`min-h-12 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 dark:ring-offset-[#07111F] ${mode === "review" ? "hidden" : ""}`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => completeAndNavigate("/register")}
                className={`min-h-12 rounded-2xl border border-sky-200 bg-white px-5 py-3 text-sm font-black text-sky-600 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 dark:border-white/15 dark:bg-[#102138] dark:text-blue-200 dark:hover:bg-[#17304e] ${mode === "review" ? "hidden" : ""}`}
              >
                إنشاء حساب
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => goToSlide(slideIndex + 1)}
              className="min-h-12 w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 dark:ring-offset-[#07111F]"
            >
              التالي
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
