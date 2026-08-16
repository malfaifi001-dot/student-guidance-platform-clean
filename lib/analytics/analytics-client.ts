"use client";

import { sendGAEvent } from "@next/third-parties/google";
import type {
  AnalyticsEventParams,
  AnalyticsParamValue,
  AnalyticsRole,
} from "@/lib/analytics/analytics-types";
import { ANALYTICS_ROLES } from "@/lib/analytics/analytics-types";
import type { AnalyticsEventName } from "@/lib/analytics/analytics-events";

type GtagCommand = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagCommand;
  }
}

export const GA_MEASUREMENT_ID = "G-7NPFWYDTJP";

const SAFE_PARAMETER_KEYS = new Set<keyof AnalyticsEventParams>([
  "role",
  "method",
  "feature",
  "source",
  "result",
  "row_count_bucket",
  "service_slug",
  "workflow_type",
  "report_type",
  "template_type",
  "export_format",
  "activity_domain_slug",
  "status",
  "plan_slug",
  "activation_method",
  "intervention_target_type",
  "reason",
]);

let lastIdentitySignature: string | null = null;

function isSafeValue(value: unknown): value is AnalyticsParamValue {
  if (typeof value === "string") {
    return (
      value.length > 0 &&
      value.length <= 80 &&
      /^[A-Za-z0-9_.:-]+$/.test(value)
    );
  }

  return typeof value === "number" || typeof value === "boolean";
}

function sanitizeEventParams(params?: AnalyticsEventParams) {
  if (!params) {
    return undefined;
  }

  const entries = Object.entries(params).filter(([key, value]) => {
    return (
      SAFE_PARAMETER_KEYS.has(key as keyof AnalyticsEventParams) &&
      isSafeValue(value)
    );
  });

  return entries.length
    ? Object.fromEntries(entries)
    : undefined;
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  params?: AnalyticsEventParams,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sendGAEvent("event", eventName, sanitizeEventParams(params) || {});
  } catch {
    // Analytics must never interrupt the product flow.
  }
}

function ensureDataLayer() {
  if (typeof window === "undefined") {
    return null;
  }

  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

function pushGtagCommand(...args: unknown[]) {
  const dataLayer = ensureDataLayer();
  if (!dataLayer) {
    return;
  }

  if (window.gtag) {
    window.gtag(...args);
    return;
  }

  dataLayer.push(args);
}

export function setAnalyticsUserIdentity(
  analyticsUserId: string | null,
  role: AnalyticsRole | string | null,
) {
  const dataLayer = ensureDataLayer();
  if (!dataLayer) {
    return;
  }

  const safeRole =
    role && (ANALYTICS_ROLES as readonly string[]).includes(role)
      ? role
      : null;
  const signature = `${analyticsUserId || ""}|${safeRole || ""}`;
  if (lastIdentitySignature === signature) {
    return;
  }

  pushGtagCommand(
    "config",
    GA_MEASUREMENT_ID,
    { user_id: analyticsUserId || null },
  );
  pushGtagCommand(
    "set",
    "user_properties",
    safeRole ? { role: safeRole } : {},
  );
  lastIdentitySignature = signature;
}

export function clearAnalyticsUserIdentity() {
  const dataLayer = ensureDataLayer();
  if (!dataLayer) {
    return;
  }

  pushGtagCommand(
    "config",
    GA_MEASUREMENT_ID,
    { user_id: null },
  );
  pushGtagCommand("set", "user_properties", {});
  lastIdentitySignature = null;
}
