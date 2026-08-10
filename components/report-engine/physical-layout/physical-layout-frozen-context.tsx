"use client";

import {
  createContext,
  type ReactNode,
  useContext,
} from "react";

import type {
  PhysicalLayoutFrozenSettings,
} from "@/lib/report-engine/physical-layout/physical-layout-types";

/**
 * ============================================================
 * FROZEN PHYSICAL LAYOUT CONTEXT
 * ============================================================
 *
 * هذا الـ Context لا يستخدم أثناء Measurement.
 *
 * يستخدم فقط عندما تكون Physical Page قد:
 *
 * 1. تم قياسها.
 * 2. تم اختيار Smart A4 candidate لها.
 * 3. دخلت PhysicalLayoutPlan النهائية.
 *
 * عندها يصبح Final Renderer مستهلكًا للقرار فقط.
 * لا يسمح له بإعادة Pagination أو إعادة Smart A4 negotiation.
 */

const PhysicalLayoutFrozenContext =
  createContext<
    PhysicalLayoutFrozenSettings | null
  >(null);

export function PhysicalLayoutFrozenProvider({
  value,
  children,
}: {
  value: PhysicalLayoutFrozenSettings;
  children: ReactNode;
}) {
  return (
    <PhysicalLayoutFrozenContext.Provider
      value={value}
    >
      {children}
    </PhysicalLayoutFrozenContext.Provider>
  );
}

export function usePhysicalLayoutFrozenSettings() {
  return useContext(
    PhysicalLayoutFrozenContext,
  );
}