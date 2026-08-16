"use client";

import { useEffect } from "react";
import { setAnalyticsUserIdentity } from "@/lib/analytics/analytics-client";

export function AuthenticatedAnalyticsIdentity({
  analyticsUserId,
  role,
}: {
  analyticsUserId: string | null;
  role: string;
}) {
  useEffect(() => {
    setAnalyticsUserIdentity(analyticsUserId, role);
  }, [analyticsUserId, role]);

  return null;
}
