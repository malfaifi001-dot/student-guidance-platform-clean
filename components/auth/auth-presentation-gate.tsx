"use client";

import { useEffect, useState } from "react";

import { isNativeCapacitor } from "@/lib/native/native-runtime";

export type AuthPresentation = "unknown" | "native" | "web";

export function useAuthPresentation(): AuthPresentation {
  const [presentation, setPresentation] = useState<AuthPresentation>("unknown");

  useEffect(() => {
    setPresentation(isNativeCapacitor() ? "native" : "web");
  }, []);

  return presentation;
}

export function AuthPresentationPending() {
  return (
    <main
      aria-hidden="true"
      className="min-h-[100dvh] bg-slate-50 dark:bg-[#07111F]"
    />
  );
}
