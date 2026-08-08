"use client";

import {
  createContext,
  type ReactNode,
  useContext,
} from "react";

const TRANSIENT_KEYS = new Set([
  "candidateVersion",
  "layoutResultFingerprint",
  "measuredOverflow",
  "measurementVersion",
  "planningPhase",
  "smartA4Candidate",
  "smartA4Mode",
]);

function canonicalize(
  value: unknown,
  seen: WeakSet<object>,
): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "bigint") {
    return String(value);
  }

  if (
    typeof value === "undefined" ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[circular]";
    }

    seen.add(value);

    const normalized = Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(
          ([key]) =>
            !TRANSIENT_KEYS.has(key) &&
            !key.startsWith("data-smart-a4-") &&
            !key.startsWith("data-report-density"),
        )
        .sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0,
        )
        .map(([key, item]) => [key, canonicalize(item, seen)]),
    );

    seen.delete(value);
    return normalized;
  }

  return String(value);
}

export function createSemanticInputFingerprint(value: unknown) {
  return JSON.stringify(canonicalize(value, new WeakSet()));
}

export function getFingerprintPrefix(fingerprint: string) {
  let hash = 2166136261;

  for (let index = 0; index < fingerprint.length; index += 1) {
    hash ^= fingerprint.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function roundLayoutMetric(value: number, precision = 1) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

const ReportSmartSemanticFingerprintContext =
  createContext("standalone-report-layout");

export function ReportSmartSemanticFingerprintProvider({
  fingerprint,
  children,
}: {
  fingerprint: string;
  children: ReactNode;
}) {
  return (
    <ReportSmartSemanticFingerprintContext.Provider value={fingerprint}>
      {children}
    </ReportSmartSemanticFingerprintContext.Provider>
  );
}

export function useReportSmartSemanticFingerprint() {
  return useContext(ReportSmartSemanticFingerprintContext);
}
