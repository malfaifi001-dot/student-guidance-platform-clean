"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TeacherOnboardingPopCard } from "@/components/guidance/teacher-onboarding-pop-card";
import { normalizeGuidanceGender } from "@/lib/guidance/arabic-gender-copy";
import { getCaseIdFromJourneyPath } from "@/lib/guidance/teacher-onboarding-journey";
import { readRoleOnboardingState, writeRoleOnboardingState } from "@/lib/guidance/guidance-storage";
import { getRoleOnboardingServices, getRoleOnboardingStartPath, getRoleOnboardingCard, getRolePortfolioPath, ROLE_ONBOARDING_INITIAL_STATE, type GuidedWorkspaceRole, type RoleOnboardingPhase, type RoleOnboardingState } from "@/lib/guidance/role-onboarding-journey";

const CASE_SAVED_EVENT = "teachix:case-saved";
const REPORT_SAVED_EVENT = "teachix:report-approved";

export function RoleOnboardingController({ userId, role, gender, displayName, onActiveChange }: { userId: string; role: GuidedWorkspaceRole; gender?: string | null; displayName?: string | null; onActiveChange?: (active: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const services = useMemo(() => getRoleOnboardingServices(role), [role]);
  const [state, setState] = useState<RoleOnboardingState | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [waitingDismissed, setWaitingDismissed] = useState(false);

  const update = useCallback((values: Partial<RoleOnboardingState>) => {
    setState((current) => {
      if (!current) return current;
      const next = { ...current, ...values, updatedAt: new Date().toISOString() };
      writeRoleOnboardingState(userId, next);
      return next;
    });
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readRoleOnboardingState(userId, role);
      if (stored.status === "unseen" && pathname === getRoleOnboardingStartPath(role)) {
        const next = { ...stored, status: "in_progress" as const };
        writeRoleOnboardingState(userId, next);
        setState(next);
      } else setState(stored);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, role, userId]);

  useEffect(() => {
    const active = state?.status === "in_progress" && state.phase !== "COMPLETED";
    onActiveChange?.(active);
    document.documentElement.toggleAttribute("data-teachix-role-onboarding", active);
  }, [onActiveChange, state]);

  useEffect(() => {
    if (!state || state.status !== "in_progress") return;
    const timer = window.setTimeout(() => {
      const caseId = getCaseIdFromJourneyPath(pathname);
      if (state.phase === "CREATE_WORK" && pathname.endsWith("/new")) update({ phase: "WORKFLOW_FORM" });
      else if ((state.phase === "WORKING" || state.phase === "PREPARE") && pathname.includes("/report-2/cases/") && pathname.endsWith("/prepare")) update({ phase: "PREPARE", caseId });
      else if ((state.phase === "PREPARE_WAIT" || state.phase === "DESCRIPTION") && pathname.endsWith("/studio")) update({ phase: "STUDIO", caseId });
      else if (state.phase === "RETURN_STUDIO" && pathname.endsWith("/studio")) update({ phase: "SAVE_REPORT", caseId });
      else if (state.phase === "PORTFOLIO" && pathname === getRolePortfolioPath(role)) update({ phase: "COMPLETED", status: "completed" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, role, state, update]);

  useEffect(() => {
    const onCaseSaved = (raw: Event) => {
      if (!state || state.status !== "in_progress" || state.phase !== "WORKING") return;
      const event = raw as CustomEvent<{ caseId?: string }>;
      const caseId = String(event.detail?.caseId || "").trim();
      if (!caseId) return;
      update({ phase: "PREPARE", caseId });
      setWaitingDismissed(false);
    };
    const onReportSaved = (raw: Event) => {
      if (!state || state.status !== "in_progress" || (state.phase !== "SAVE_REPORT" && state.phase !== "SAVE_REPORT_WAIT")) return;
      raw.preventDefault();
      update({ phase: "PORTFOLIO" });
      router.push(getRolePortfolioPath(role));
    };
    window.addEventListener(CASE_SAVED_EVENT, onCaseSaved);
    window.addEventListener(REPORT_SAVED_EVENT, onReportSaved);
    return () => { window.removeEventListener(CASE_SAVED_EVENT, onCaseSaved); window.removeEventListener(REPORT_SAVED_EVENT, onReportSaved); };
  }, [role, router, state, update]);

  const card = useMemo(() => state ? getRoleOnboardingCard(state.phase, role, normalizeGuidanceGender(gender), displayName) : null, [displayName, gender, role, state]);
  const onPrimary = useCallback(() => {
    if (!state) return;
    const next = (phase: RoleOnboardingPhase) => update({ phase });
    switch (state.phase) {
      case "WELCOME": next("SELECT_SERVICE"); break;
      case "SELECT_SERVICE": { const service = services.find((item) => item.slug === selectedSlug); if (service) { update({ phase: "CREATE_WORK", servicePath: service.href }); router.push(`${service.href}/new`); } break; }
      case "CREATE_WORK": break;
      case "WORKFLOW_FORM": { const root = document.querySelector<HTMLElement>("[data-workflow-supports-evidence]"); next(root?.dataset.workflowSupportsEvidence === "true" ? "EVIDENCE" : "WORKING"); break; }
      case "EVIDENCE": next("WORKING"); break;
      case "PREPARE": next("DESCRIPTION"); break;
      case "DESCRIPTION": next("PREPARE_WAIT"); break;
      case "STUDIO": { const returnUrl = `${window.location.pathname}${window.location.search}`; update({ phase: "SCHOOL_IDENTITY", returnUrl, caseId: state.caseId || getCaseIdFromJourneyPath(pathname) }); router.push("/dashboard/settings/school"); break; }
      case "SCHOOL_IDENTITY": next("SCHOOL_WAIT"); break;
      case "RETURN_STUDIO": router.push(state.returnUrl || "/dashboard"); break;
      case "SAVE_REPORT": next("SAVE_REPORT_WAIT"); break;
      case "PORTFOLIO": update({ phase: "COMPLETED", status: "completed" }); break;
      default: break;
    }
  }, [pathname, router, selectedSlug, services, state, update]);

  useEffect(() => {
    if (!state || state.status !== "in_progress" || state.phase !== "SCHOOL_WAIT" || pathname !== "/dashboard/settings/school") return;
    const timer = window.setInterval(() => {
      const settings = document.querySelector<HTMLElement>('[data-guidance="teacher-school-settings"]');
      if (settings?.dataset.schoolIdentityReady === "true") update({ phase: "RETURN_STUDIO" });
    }, 500);
    return () => window.clearInterval(timer);
  }, [pathname, state, update]);

  if (!state || state.status !== "in_progress" || state.phase === "COMPLETED" || state.phase === "WORKING" || state.phase === "SCHOOL_WAIT" || state.phase === "PREPARE_WAIT" || state.phase === "SAVE_REPORT_WAIT" || !card) {
    if (state?.phase === "SCHOOL_WAIT" && state.returnUrl) return <button type="button" onClick={() => router.push(state.returnUrl || "/dashboard")} className="fixed bottom-5 left-5 z-[165] rounded-full border border-sky-200 bg-white px-4 py-2.5 text-xs font-black text-sky-700 shadow-lg dark:border-sky-500/30 dark:bg-slate-950 dark:text-sky-300" dir="rtl">العودة لتقريري</button>;
    return null;
  }

  return <TeacherOnboardingPopCard card={card} performanceServices={services} selectedPerformanceSlug={selectedSlug} onPerformanceSelect={(slug) => { setSelectedSlug(slug); const service = services.find((item) => item.slug === slug); if (service) { update({ phase: "CREATE_WORK", servicePath: service.href }); router.push(`${service.href}/new`); } }} onPrimary={onPrimary} onPause={() => update({ status: "paused" })} onDismiss={() => state.phase === "WORKING" ? setWaitingDismissed(true) : update({ status: "paused" })} onLuckyAnswer={() => undefined} />;
}
