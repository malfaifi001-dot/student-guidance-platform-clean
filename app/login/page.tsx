"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { useState } from "react";

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تسجيل الدخول.");
      }

      window.location.href = data.redirectTo || "/dashboard";
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "حدث خطأ غير متوقع.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden bg-white text-slate-950"
    >
      <div className="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[0.92fr_1.08fr]">
        {/* FORM */}
        <section className="flex min-h-screen items-center px-5 py-12 sm:px-8 lg:px-14 xl:px-20">
          <div className="mx-auto w-full max-w-[430px]">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 text-base font-black text-white">
                T
              </div>

              <span className="text-xl font-black tracking-tight text-slate-950">
                Teachix
              </span>
            </Link>

            <div className="mt-16">
              <p className="text-sm font-black text-sky-600">
                تسجيل الدخول
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
                مرحبًا بعودتك
              </h1>
            </div>

            {error ? (
              <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={submit} className="mt-9 space-y-5">
              <AuthInput
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="name@example.com"
              />

              <AuthInput
                label="كلمة المرور"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={setPassword}
                trailingAction={{
                  label: passwordVisible
                    ? "إخفاء كلمة المرور"
                    : "إظهار كلمة المرور",
                  icon: passwordVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  ),
                  onClick: () =>
                    setPasswordVisible((current) => !current),
                }}
              />

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-sky-600/10 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "جاري الدخول..." : "دخول"}

                {!loading ? (
                  <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                ) : null}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-100 pt-7 text-center">
              <p className="text-sm font-bold text-slate-500">
                ليس لديك حساب؟
              </p>

              <Link
                href="/register"
                className="mt-3 inline-flex items-center gap-2 text-sm font-black text-sky-600 transition hover:text-sky-700"
              >
                إنشاء حساب جديد
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* LOGIN VISUAL */}
        <aside className="relative hidden overflow-hidden border-r border-slate-100 bg-[#f8fbfe] lg:flex lg:min-h-screen lg:items-center lg:justify-center lg:px-12 xl:px-20">
          <div className="absolute -right-40 top-8 h-[440px] w-[440px] rounded-full bg-sky-100/60 blur-3xl" />
          <div className="absolute -left-40 bottom-6 h-[360px] w-[360px] rounded-full bg-blue-50 blur-3xl" />

          <div className="relative w-full max-w-[610px]">
            <h2 className="max-w-xl text-4xl font-black leading-tight tracking-[-0.04em] text-slate-950 xl:text-5xl">
              أعمالك جاهزة عندما تعود.
            </h2>

            <div className="relative mx-auto mt-12 max-w-[520px]">
              <div className="absolute inset-8 rounded-[3rem] bg-sky-100/70 blur-3xl" />

              <div className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white p-7 shadow-[0_45px_120px_-55px_rgba(15,23,42,0.32)]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                  <div>
                    <p className="text-xs font-black text-sky-600">
                      Teachix
                    </p>

                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      حسابك
                    </h3>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-8 rounded-[26px] bg-slate-50 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sky-600 shadow-sm">
                      <UserRound className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <div className="h-3 w-28 rounded-full bg-slate-900" />
                      <div className="mt-3 h-2.5 w-20 rounded-full bg-slate-200" />
                    </div>

                    <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
                      نشط
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <LoginStatus
                    title="الجلسة"
                    value="آمنة"
                  />

                  <LoginStatus
                    title="الصلاحيات"
                    value="جاهزة"
                  />

                  <LoginStatus
                    title="آخر دخول"
                    value="محفوظ"
                  />
                </div>

                <div className="mt-5 rounded-[24px] border border-sky-100 bg-sky-50/60 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600">
                      <Check className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-950">
                        مساحة العمل جاهزة
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-400">
                        ادخل وتابع مباشرة
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function LoginStatus({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-4">
      <p className="text-sm font-black text-slate-800">
        {title}
      </p>

      <p className="text-xs font-black text-sky-600">
        {value}
      </p>
    </div>
  );
}

function AuthInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  trailingAction,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  trailingAction?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  };
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">
        {label}
      </span>

      <div className="relative mt-2.5">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={[
            "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-50",
            trailingAction ? "pl-12" : "",
          ].join(" ")}
          required
        />

        {trailingAction ? (
          <button
            type="button"
            onClick={trailingAction.onClick}
            aria-label={trailingAction.label}
            className="absolute inset-y-0 left-3 inline-flex items-center justify-center text-slate-400 transition hover:text-sky-600"
          >
            {trailingAction.icon}
          </button>
        ) : null}
      </div>
    </label>
  );
}