"use client";

import { useEffect, useMemo } from "react";
import { useGuidance } from "@/components/guidance/guidance-provider";
import type { GuidanceContextKey } from "@/lib/guidance/guidance-types";

export function GuidanceScope({ context, capabilities = [], autoStart = true }: { context: GuidanceContextKey; capabilities?: string[]; autoStart?: boolean }) {
  const { setScope } = useGuidance();
  const capabilityKey = capabilities.join("|");
  const stableCapabilities = useMemo(() => capabilities, [capabilityKey]);

  useEffect(() => {
    setScope({ context, capabilities: stableCapabilities, autoStart });
    return () => setScope((current) => current?.context === context ? null : current);
  }, [autoStart, context, setScope, stableCapabilities]);

  return null;
}
