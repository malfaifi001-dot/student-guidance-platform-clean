import type { GuidanceContextKey, GuidanceProgress, GuidanceProgressStatus } from "@/lib/guidance/guidance-types";
import {
  INITIAL_TEACHER_ONBOARDING_STATE,
  TEACHER_ONBOARDING_PHASES,
  type TeacherOnboardingState,
} from "@/lib/guidance/teacher-onboarding-journey";

const PREFIX = "guidance-progress:v1";

function key(userId: string, context: GuidanceContextKey) {
  return `${PREFIX}:${userId}:${context}`;
}

export function readGuidanceProgress(userId: string, context: GuidanceContextKey): GuidanceProgress {
  if (typeof window === "undefined") return { status: "unseen", lastStepIndex: 0, updatedAt: "" };
  try {
    const value = JSON.parse(window.localStorage.getItem(key(userId, context)) || "null");
    if (value && typeof value.status === "string") return value as GuidanceProgress;
  } catch {}
  return { status: "unseen", lastStepIndex: 0, updatedAt: "" };
}

export function writeGuidanceProgress(userId: string, context: GuidanceContextKey, status: GuidanceProgressStatus, lastStepIndex: number) {
  if (typeof window === "undefined") return;
  const value: GuidanceProgress = { status, lastStepIndex, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(key(userId, context), JSON.stringify(value));
}

const TEACHER_JOURNEY_PREFIX = "guidance-progress:teacher-onboarding:v1";

function teacherJourneyKey(userId: string) {
  return `${TEACHER_JOURNEY_PREFIX}:${userId}`;
}

export function readTeacherOnboardingState(userId: string): TeacherOnboardingState {
  if (typeof window === "undefined") return { ...INITIAL_TEACHER_ONBOARDING_STATE };
  try {
    const value = JSON.parse(window.localStorage.getItem(teacherJourneyKey(userId)) || "null");
    if (
      value?.version === 1 &&
      TEACHER_ONBOARDING_PHASES.includes(value.phase) &&
      ["unseen", "in_progress", "paused", "completed"].includes(value.status)
    ) {
      return { ...INITIAL_TEACHER_ONBOARDING_STATE, ...value };
    }
  } catch {}
  return { ...INITIAL_TEACHER_ONBOARDING_STATE };
}

export function writeTeacherOnboardingState(userId: string, state: TeacherOnboardingState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    teacherJourneyKey(userId),
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }),
  );
}
