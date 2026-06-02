"use client";

import { useState } from "react";

type Props = {
  initialImpersonating?: boolean;
};

export function AdminImpersonationReturnButton({
  initialImpersonating = false,
}: Props) {
  const [impersonating, setImpersonating] = useState(initialImpersonating);
  const [loading, setLoading] = useState(false);

  async function exitImpersonation() {
    setLoading(true);

    const response = await fetch("/api/dashboard/admin/impersonation/exit", {
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = data.redirectTo || "/dashboard/admin/users/manage";
      return;
    }

    alert(data.error || "تعذر الرجوع لحساب الأدمن.");
    setLoading(false);
    setImpersonating(false);
  }

  if (!impersonating) return null;

  return (
    <div dir="rtl" className="fixed bottom-5 left-5 z-[9999]">
      <button
        onClick={exitImpersonation}
        disabled={loading}
        className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-xl disabled:opacity-50"
      >
        {loading ? "جاري الرجوع..." : "الرجوع لحساب الأدمن"}
      </button>
    </div>
  );
}
