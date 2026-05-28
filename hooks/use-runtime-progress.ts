"use client";

import { useMemo } from "react";

import { calculateRuntimeProgress } from "@/engine/runtime-ui/runtime-progress-engine";

type RuntimeField = {
  key: string;
  isRequired?: boolean;
};

type RuntimeStep = {
  id: string;
  title: string;
  fields: RuntimeField[];
};

export function useRuntimeProgress(params: {
  steps: RuntimeStep[];
  values: Record<string, unknown>;
}) {
  return useMemo(() => {
    return calculateRuntimeProgress(params);
  }, [params]);
}