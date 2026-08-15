"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TeacherOnboardingPopCard } from "@/components/guidance/teacher-onboarding-pop-card";
import { normalizeGuidanceGender } from "@/lib/guidance/arabic-gender-copy";
import { TEACHER_PERFORMANCE_SERVICES } from "@/lib/teacher-performance/teacher-performance-services";
import {
  getCaseIdFromJourneyPath,
  getTeacherJourneyCard,
  INITIAL_TEACHER_ONBOARDING_STATE,
  isTeacherPerformancePath,
  type TeacherOnboardingPhase,
  type TeacherOnboardingState,
} from "@/lib/guidance/teacher-onboarding-journey";
import {
  readTeacherOnboardingState,
  writeTeacherOnboardingState,
} from "@/lib/guidance/guidance-storage";

const REPLAY_EVENT = "teachix:teacher-onboarding-replay";
const CASE_SAVED_EVENT = "teachix:case-saved";
const REPORT_SAVED_EVENT = "teachix:report-approved";
const SIGNATURE_REQUESTED_EVENT = "teachix:principal-signature-requested";
const SCHOOL_SETTINGS_SAVED_EVENT = "teachix:school-settings-saved";

function target(name: string) {
  return document.querySelector<HTMLElement>(`[data-guidance="${name}"]`);
}

function clickTarget(name: string) {
  const element = target(name);
  if (!element) return false;
  const clickable = element.matches("button,a")
    ? element
    : element.querySelector<HTMLElement>("button:not([disabled]),a[href]");
  clickable?.click();
  return Boolean(clickable);
}

export function TeacherOnboardingController({
  userId,
  gender,
  onActiveChange,
}: {
  userId: string;
  gender?: string | null;
  onActiveChange?: (active: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<TeacherOnboardingState | null>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedPerformanceSlug, setSelectedPerformanceSlug] = useState("");
  const [waitingCardDismissed, setWaitingCardDismissed] = useState(false);
  const [restartConfirm, setRestartConfirm] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readTeacherOnboardingState(userId);
      if (stored.status === "unseen" && pathname === "/dashboard/teacher") {
        const next = { ...stored, status: "in_progress" as const, updatedAt: new Date().toISOString() };
        writeTeacherOnboardingState(userId, next);
        setState(next);
      } else {
        setState(stored);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, userId]);

  const update = useCallback((values: Partial<TeacherOnboardingState>) => {
    setState((current) => {
      if (!current) return current;
      const next = { ...current, ...values, updatedAt: new Date().toISOString() };
      writeTeacherOnboardingState(userId, next);
      return next;
    });
  }, [userId]);

  useEffect(() => {
    if (state) writeTeacherOnboardingState(userId, state);
    const active = state?.status === "in_progress" && state.phase !== "COMPLETED";
    onActiveChange?.(active);
    document.documentElement.toggleAttribute("data-teacher-onboarding", active);
    window.dispatchEvent(new CustomEvent("teachix:teacher-onboarding-active", { detail: { active } }));
    return () => document.documentElement.removeAttribute("data-teacher-onboarding");
  }, [onActiveChange, state, userId]);

  useEffect(() => {
    const replay = () => {
      setRestartConfirm(true);
    };
    window.addEventListener(REPLAY_EVENT, replay);
    return () => window.removeEventListener(REPLAY_EVENT, replay);
  }, [update, userId]);

  useEffect(() => {
    if (!state || state.status !== "in_progress") return;
    const timer = window.setTimeout(() => {
      const caseId = getCaseIdFromJourneyPath(pathname);

      if (state.phase === "SELECT_PERFORMANCE" && isTeacherPerformancePath(pathname)) {
        update({ phase: "CREATE_WORK", selectedPerformancePath: pathname });
      } else if (state.phase === "CREATE_WORK" && pathname.endsWith("/new")) {
        update({ phase: "WORKFLOW_FORM" });
      } else if ((state.phase === "SUBMIT_WORK" || state.phase === "WORKING") && pathname.includes("/report-2/cases/") && pathname.endsWith("/prepare")) {
        update({ phase: "LUCKY20", caseId });
      } else if ((state.phase === "CASE_REPORT" || state.phase === "CASE_EDIT") && pathname.endsWith("/prepare")) {
        update({ phase: "LUCKY20", caseId });
      } else if ((state.phase === "REPORT_DESCRIPTION" || state.phase === "STUDIO_WAIT") && pathname.endsWith("/studio")) {
        update({ phase: "REPORT_PREVIEW", caseId });
      } else if (state.phase === "RETURN_REPORT" && pathname.endsWith("/studio")) {
        update({ phase: "REFLECTED_IDENTITY", caseId });
      } else if (state.phase === "PORTFOLIO" && pathname === "/dashboard/teacher/portfolio") {
        clickTarget("teacher-portfolio-reports-tab");
      }
    }, state.phase === "REPORT_DESCRIPTION" ? 650 : 0);
    return () => window.clearTimeout(timer);
  }, [pathname, state, update]);

  useEffect(() => {
    if (!state || state.status !== "in_progress" || state.phase !== "SAVE_REPORT" || !pathname.endsWith("/studio")) return;
    const timer = window.setTimeout(() => {
      const canvas = target("studio-report-canvas");
      if (canvas?.dataset.reportApproved === "true") {
        update({ phase: "SAVED_REPORT", reportId: canvas.dataset.reportId || state.reportId });
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pathname, state, update]);

  useEffect(() => {
    if (!state || state.status !== "in_progress" || pathname !== "/dashboard/settings/school") return;
    if (state.phase !== "SCHOOL_IDENTITY" && state.phase !== "SCHOOL_WAIT" && state.phase !== "PRINCIPAL_NAME") return;
    const timer = window.setTimeout(() => {
      const settings = target("teacher-school-settings");
      if (!settings) return;
      const schoolReady = settings.dataset.schoolIdentityReady === "true";
      const principalReady = settings.dataset.principalNameReady === "true";
      if ((state.phase === "SCHOOL_IDENTITY" || state.phase === "SCHOOL_WAIT") && schoolReady) {
        update({ phase: "RETURN_REPORT" });
      } else if (state.phase === "PRINCIPAL_NAME" && principalReady) {
        update({ phase: "RETURN_REPORT" });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [pathname, state, update]);

  useEffect(() => {
    const caseSaved = (rawEvent: Event) => {
      if (!state || state.status !== "in_progress" || (state.phase !== "SUBMIT_WORK" && state.phase !== "WORKING")) return;
      const event = rawEvent as CustomEvent<{ caseId?: string }>;
      const caseId = String(event.detail?.caseId || "").trim();
      if (!caseId) return;
      update({ phase: "LUCKY20", caseId });
      setWaitingCardDismissed(false);
    };
    const reportSaved = (rawEvent: Event) => {
      if (!state || state.status !== "in_progress" || state.phase !== "SAVE_REPORT") return;
      const event = rawEvent as CustomEvent<{ reportId?: string }>;
      event.preventDefault();
      update({ phase: "SAVED_REPORT", reportId: String(event.detail?.reportId || "") || null });
    };
    const signatureRequested = () => {
      if (state?.status === "in_progress" && state.phase === "SIGNATURE") {
        update({ phase: "RETURN_REPORT" });
      }
    };
    const schoolSettingsSaved = (event: Event) => {
      if (state?.status !== "in_progress" || state.phase !== "PRINCIPAL_NAME") return;
      event.preventDefault();
      update({ phase: "RETURN_REPORT" });
    };
    window.addEventListener(CASE_SAVED_EVENT, caseSaved);
    window.addEventListener(REPORT_SAVED_EVENT, reportSaved);
    window.addEventListener(SIGNATURE_REQUESTED_EVENT, signatureRequested);
    window.addEventListener(SCHOOL_SETTINGS_SAVED_EVENT, schoolSettingsSaved);
    return () => {
      window.removeEventListener(CASE_SAVED_EVENT, caseSaved);
      window.removeEventListener(REPORT_SAVED_EVENT, reportSaved);
      window.removeEventListener(SIGNATURE_REQUESTED_EVENT, signatureRequested);
      window.removeEventListener(SCHOOL_SETTINGS_SAVED_EVENT, schoolSettingsSaved);
    };
  }, [state, update]);

  const journeyCard = useMemo(
    () => state ? getTeacherJourneyCard(state.phase, normalizeGuidanceGender(gender), state.lucky20Reward) : null,
    [gender, state],
  );
  const card = restartConfirm ? {
    title: "إعادة بدء الرحلة؟",
    description: "بنرجعك للبداية ونشرح لك Teachix من جديد. بياناتك الحالية ما راح تتأثر.",
    primaryLabel: "ابدأ من جديد",
    secondaryLabel: "إلغاء",
  } : journeyCard;

  const onPrimary = useCallback(() => {
    if (!state) return;
    setFeedback("");
    if (restartConfirm) {
      const next = { ...INITIAL_TEACHER_ONBOARDING_STATE, status: "in_progress" as const, updatedAt: new Date().toISOString() };
      writeTeacherOnboardingState(userId, next);
      setState(next);
      setRestartConfirm(false);
      setSelectedPerformanceSlug("");
      router.push("/dashboard/teacher");
      return;
    }
    const next = (phase: TeacherOnboardingPhase) => update({ phase });
    switch (state.phase) {
      case "WELCOME": next("INTRO"); break;
      case "INTRO": next("SELECT_PERFORMANCE"); break;
      case "SELECT_PERFORMANCE": {
        const service = TEACHER_PERFORMANCE_SERVICES.find((item) => item.slug === selectedPerformanceSlug);
        if (service) {
          update({ phase: "CREATE_WORK", selectedPerformancePath: service.href });
          router.push(`${service.href}/new`);
        }
        break;
      }
      case "CREATE_WORK": clickTarget("service-create"); break;
      case "WORKFLOW_FORM": {
        const workflowRoot = document.querySelector<HTMLElement>("[data-workflow-supports-evidence]");
        next(workflowRoot?.dataset.workflowSupportsEvidence === "true" ? "EVIDENCE" : "WORKING");
        break;
      }
      case "EVIDENCE": next("WORKING"); break;
      case "WORKING": break;
      case "SUBMIT_WORK": clickTarget("workflow-submit"); break;
      case "CASE_EDIT": next("CASE_REPORT"); break;
      case "CASE_REPORT": clickTarget("case-report"); break;
      case "REPORT_FIELDS": next("REPORT_DESCRIPTION"); break;
      case "LUCKY20": if (state.lucky20Reward) next("REPORT_FIELDS"); break;
      case "REPORT_DESCRIPTION": next("STUDIO_WAIT"); break;
      case "REPORT_PREVIEW": {
        const returnUrl = `${window.location.pathname}?mode=preview&variant=official-activity-card`;
        const reportId = target("studio-report-canvas")?.dataset.reportId || state.reportId;
        update({ phase: "SCHOOL_IDENTITY", returnUrl, reportId, caseId: state.caseId || getCaseIdFromJourneyPath(pathname) });
        router.push("/dashboard/settings/school");
        break;
      }
      case "SCHOOL_IDENTITY": next("SCHOOL_WAIT"); break;
      case "PRINCIPAL_NAME": {
        const settings = target("teacher-school-settings");
        if (settings?.dataset.hasChanges === "true") {
          clickTarget("teacher-school-save");
        } else {
          next(settings?.dataset.principalSignatureReady === "true" ? "RETURN_REPORT" : "SIGNATURE");
        }
        break;
      }
      case "SIGNATURE": clickTarget("teacher-principal-signature-request"); break;
      case "RETURN_REPORT": router.push(state.returnUrl || (state.caseId ? `/dashboard/report-2/cases/${state.caseId}/studio?mode=preview` : "/dashboard/teacher")); break;
      case "REFLECTED_IDENTITY": next("SAVE_REPORT"); break;
      case "SAVE_REPORT": clickTarget("teacher-report-finalize"); break;
      case "SAVED_REPORT": {
        update({ phase: "PORTFOLIO" });
        router.push("/dashboard/teacher/portfolio");
        break;
      }
      case "PORTFOLIO": update({ phase: "COMPLETED", status: "completed" }); break;
    }
  }, [pathname, restartConfirm, router, selectedPerformanceSlug, state, update, userId]);

  const onLuckyAnswer = useCallback(async (answer: number) => {
    if (!state || busy) return;
    const attempts = state.lucky20Attempts + 1;
    update({ lucky20Attempts: attempts });
    if (answer !== 1500) {
      setFeedback("أكثر ");
      return;
    }

    setBusy(true);
    let earned = false;
    try {
      const response = await fetch("/api/dashboard/guidance/teacher-onboarding/lucky20", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      earned = response.ok && payload.earned === true && attempts === 1;
    } catch {}
    update({ lucky20Earned: earned, lucky20Reward: true });
    setFeedback("");
    setBusy(false);
  }, [busy, state, update]);

  const onPerformanceSelect = useCallback((slug: string) => {
    setSelectedPerformanceSlug(slug);
    const service = TEACHER_PERFORMANCE_SERVICES.find((item) => item.slug === slug);
    if (!service) return;
    update({ phase: "CREATE_WORK", selectedPerformancePath: service.href });
    router.push(`${service.href}/new`);
  }, [router, update]);

  const waitingForPrepare = state?.phase === "REPORT_FIELDS" && !(pathname.includes("/report-2/cases/") && pathname.endsWith("/prepare"));
  if (!state || state.status !== "in_progress" || state.phase === "COMPLETED" || !card || waitingForPrepare || (!restartConfirm && (state.phase === "WORKING" || state.phase === "SCHOOL_WAIT" || state.phase === "STUDIO_WAIT" || state.phase === "SAVE_REPORT"))) {
    if (!restartConfirm && state?.status === "in_progress" && state.phase === "SCHOOL_WAIT" && state.returnUrl) return <FloatingReportReturn returnUrl={state.returnUrl} />;
    return null;
  }

  return (
    <TeacherOnboardingPopCard
      card={card}
      busy={busy}
      feedback={feedback}
      onPrimary={onPrimary}
      onPause={() => update({ status: "paused" })}
      onDismiss={() => restartConfirm ? setRestartConfirm(false) : state.phase === "WORKING" ? setWaitingCardDismissed(true) : update({ status: "paused" })}
      onLuckyAnswer={onLuckyAnswer}
      performanceServices={TEACHER_PERFORMANCE_SERVICES}
      selectedPerformanceSlug={selectedPerformanceSlug}
      onPerformanceSelect={onPerformanceSelect}
    />
  );
}

function FloatingReportReturn({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  return <button type="button" onClick={() => router.push(returnUrl)} className="fixed bottom-5 left-5 z-[165] rounded-full border border-sky-200 bg-white px-4 py-2.5 text-xs font-black text-sky-700 shadow-lg shadow-slate-900/10 transition hover:bg-sky-50 dark:border-sky-500/30 dark:bg-slate-950 dark:text-sky-300" dir="rtl">العودة لتقريري</button>;
}

export function replayTeacherOnboarding() {
  window.dispatchEvent(new Event(REPLAY_EVENT));
}
