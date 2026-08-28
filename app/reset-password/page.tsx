"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password, confirmation }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(body.error || "الرابط غير صالح أو منتهي الصلاحية.");
        return;
      }
      window.location.href = body.redirectTo || "/login?password=reset";
    } catch {
      setMessage("تعذر إكمال العملية حالياً. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <AuthCard title="تعيين كلمة مرور جديدة" description="استخدم رابط الاستعادة الصالح لتعيين كلمة مرور جديدة.">
        <form className="space-y-4" onSubmit={submit}>
          <input required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="كلمة المرور الجديدة" type="password" />
          <input required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="تأكيد كلمة المرور" type="password" />
          <button disabled={loading || !token} className="w-full rounded-2xl bg-sky-600 px-4 py-3 font-bold text-white disabled:opacity-60">{loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}</button>
          {message ? <p className="text-center text-sm font-bold text-rose-600">{message}</p> : null}
        </form>
      </AuthCard>
    </main>
  );
}
