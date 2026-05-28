"use client";

import { useEffect, useRef, useState } from "react";

type UseRuntimeAutosaveParams = {
  enabled?: boolean;
  delay?: number;
  payload: Record<string, unknown>;
};

export function useRuntimeAutosave({
  enabled = true,
  delay = 1500,
  payload,
}: UseRuntimeAutosaveParams) {
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    null
  );

  const [isSaving, setIsSaving] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);

        await fetch("/api/dashboard/cases/autosave", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        setLastSavedAt(
          new Date().toLocaleTimeString("ar-SA")
        );
      } catch (error) {
        console.error("Autosave failed", error);
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [payload, enabled, delay]);

  return {
    isSaving,
    lastSavedAt,
  };
}