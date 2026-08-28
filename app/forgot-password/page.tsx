"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setResetUrl("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const body = await response.json().catch(() => ({}));
      setMessage(body.message || "إذا كانت البيانات صحيحة فستصلك تعليمات الاستعادة عبر القناة المعتمدة.");
      if (body.developmentResetUrl) setResetUrl(body.developmentResetUrl);
    } catch {
      setMessage("تعذر إكمال الطلب حالياً. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <AuthCard title="استعادة كلمة المرور" description="أدخل بريدك لإرسال رابط الاستعادة لاحقاً.">
        <form className="space-y-4" onSubmit={submit}>
          <input required type="email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="البريد الإلكتروني" />
          <button disabled={loading} className="w-full rounded-2xl bg-sky-600 px-4 py-3 font-bold text-white disabled:opacity-60">{loading ? "جارٍ الإرسال..." : "إرسال الرابط"}</button>
          {message ? <p className="text-center text-sm font-bold text-slate-600">{message}</p> : null}
          {resetUrl ? <a className="block break-all text-center text-sm font-bold text-sky-700 underline" href={resetUrl}>رابط الاستعادة المحلي (للتطوير فقط)</a> : null}
        </form>
      </AuthCard>
    </main>
  );
}
