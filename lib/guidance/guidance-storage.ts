import type { GuidanceContextKey, GuidanceProgress, GuidanceProgressStatus } from "@/lib/guidance/guidance-types";

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
