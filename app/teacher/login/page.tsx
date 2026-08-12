"use client";

import { useState } from "react";
import { TeachixLogo } from "@/components/brand/teachix-logo";
import {
  classifyLoginIdentifier,
  LOGIN_IDENTIFIER_ERROR,
  normalizeLoginIdentifier,
} from "@/lib/auth/login-identifier";

export default function TeacherLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedIdentifier = normalizeLoginIdentifier(identifier);
    if (!classifyLoginIdentifier(normalizedIdentifier)) {
      setError(LOGIN_IDENTIFIER_ERROR);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: normalizedIdentifier,
          password,
          loginPath: "teacher",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تسجيل الدخول.");
      }

      window.location.href = "/dashboard/teacher";
    } catch (error) {
      setError(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10">
      <form
        onSubmit={submit}
        className="mx-auto max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <TeachixLogo />
        <h1 className="mt-3 text-3xl font-black text-slate-950">دخول المعلم</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          هذا المسار مخصص لحسابات المعلمين فقط. سيتم فتح مساحة المعلم بعد التحقق من الحساب.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-black text-slate-700">البريد الإلكتروني أو رقم الجوال</span>
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="example@email.com أو 05XXXXXXXX"
              autoComplete="username"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">كلمة المرور</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              required
            />
          </label>

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "جاري الدخول..." : "دخول مساحة المعلم"}
          </button>

          <a
            href="/login"
            className="block text-center text-sm font-bold text-slate-500 hover:text-slate-900"
          >
            الدخول من المسار العام
          </a>
        </div>
      </form>
    </main>
  );
}
