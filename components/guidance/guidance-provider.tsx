"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { GuidanceOverlay } from "@/components/guidance/guidance-overlay";
import { TeacherOnboardingController, replayTeacherOnboarding } from "@/components/guidance/teacher-onboarding-controller";
import { RoleOnboardingController } from "@/components/guidance/role-onboarding-controller";
import { resolveGuidanceSteps, isGuidanceRole } from "@/lib/guidance/guidance-resolver";
import { readGuidanceProgress, writeGuidanceProgress } from "@/lib/guidance/guidance-storage";
import type { GuidanceScopeConfig } from "@/lib/guidance/guidance-types";

type GuidanceContextValue = {
  scope: GuidanceScopeConfig | null;
  setScope: React.Dispatch<React.SetStateAction<GuidanceScopeConfig | null>>;
  replay: () => void;
  canReplay: boolean;
};

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

export function GuidanceProvider({ userId, role, gender, displayName, children }: { userId: string; role?: string | null; gender?: string | null; displayName?: string | null; children: ReactNode }) {
  const [scope, setScope] = useState<GuidanceScopeConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [teacherJourneyActive, setTeacherJourneyActive] = useState(false);
  const [roleJourneyActive, setRoleJourneyActive] = useState(false);
  const supportedRole = isGuidanceRole(role) ? role : null;
  const steps = useMemo(() => scope && supportedRole ? resolveGuidanceSteps({ context: scope.context, role: supportedRole, capabilities: scope.capabilities || [] }) : [], [scope, supportedRole]);

  useEffect(() => {
    setOpen(false);
    if (teacherJourneyActive || !scope || !supportedRole || scope.autoStart === false || !steps.length) return;
    const progress = readGuidanceProgress(userId, scope.context);
    if (progress.status === "completed" || progress.status === "skipped") return;
    const timer = window.setTimeout(() => {
      setStepIndex(Math.min(progress.lastStepIndex || 0, Math.max(steps.length - 1, 0)));
      setOpen(true);
    }, scope.context === "report-studio" ? 450 : 180);
    return () => window.clearTimeout(timer);
  }, [scope, steps.length, supportedRole, teacherJourneyActive, userId]);

  const replay = useCallback(() => {
    if (role === "TEACHER") {
      replayTeacherOnboarding();
      return;
    }
    if (!scope || !steps.length) return;
    setStepIndex(0);
    setOpen(true);
  }, [role, scope, steps.length]);

  const value = useMemo(() => ({ scope, setScope, replay, canReplay: role === "TEACHER" || Boolean(scope && supportedRole && steps.length) }), [role, scope, replay, supportedRole, steps.length]);

  return (
    <GuidanceContext.Provider value={value}>
      {children}
      {role === "TEACHER" ? (
        <TeacherOnboardingController
          userId={userId}
          gender={gender}
          onActiveChange={setTeacherJourneyActive}
        />
      ) : null}
      {role === "COUNSELOR" || role === "ACTIVITY_LEADER" ? (
        <RoleOnboardingController userId={userId} role={role} gender={gender} displayName={displayName} onActiveChange={setRoleJourneyActive} />
      ) : null}
      {role !== "TEACHER" && role !== "COUNSELOR" && role !== "ACTIVITY_LEADER" && scope && open && !teacherJourneyActive && !roleJourneyActive ? (
        <GuidanceOverlay
          steps={steps}
          initialIndex={stepIndex}
          onProgress={(index) => writeGuidanceProgress(userId, scope.context, "in_progress", index)}
          onComplete={(index) => { writeGuidanceProgress(userId, scope.context, "completed", index); setOpen(false); }}
          onSkip={(index) => { writeGuidanceProgress(userId, scope.context, "skipped", index); setOpen(false); }}
        />
      ) : null}
    </GuidanceContext.Provider>
  );
}

export function useGuidance() {
  const value = useContext(GuidanceContext);
  if (!value) throw new Error("useGuidance must be used inside GuidanceProvider");
  return value;
}
