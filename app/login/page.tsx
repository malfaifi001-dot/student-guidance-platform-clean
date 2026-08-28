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

import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { TeachixLogo } from "@/components/brand/teachix-logo";
import { BrandLoader } from "@/components/common/brand-loader";
import { NativeLoginShell } from "@/components/auth/native-login-shell";
import {
  AuthPresentationPending,
  useAuthPresentation,
} from "@/components/auth/auth-presentation-gate";
import {
  classifyLoginIdentifier,
  LOGIN_IDENTIFIER_ERROR,
  normalizeLoginIdentifier,
} from "@/lib/auth/login-identifier";
import { ANALYTICS_EVENTS } from "@/lib/analytics/analytics-events";
import { trackAnalyticsEvent } from "@/lib/analytics/analytics-client";
import { getSafeTeachixDashboardRoute } from "@/lib/deep-links/teachix-deep-link";
import {
  buildTeachixSupportWhatsAppUrl,
  TEACHIX_PASSWORD_RECOVERY_WHATSAPP_MESSAGE,
} from "@/lib/marketing/contact-details";

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export default function LoginPage() {
  const presentation = useAuthPresentation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedIdentifier = normalizeLoginIdentifier(identifier);
    const loginIdentifier = classifyLoginIdentifier(normalizedIdentifier);
    if (!loginIdentifier) {
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
          next: getSafeTeachixDashboardRoute(
            new URLSearchParams(window.location.search).get("next"),
          ),
        }),
      });

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تسجيل الدخول.");
      }

      trackAnalyticsEvent(ANALYTICS_EVENTS.LOGIN, {
        method: loginIdentifier.kind === "email" ? "email" : "phone",
      });
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

  if (presentation === "unknown") {
    return <AuthPresentationPending />;
  }

  if (presentation === "native") {
    return (
      <NativeLoginShell
        identifier={identifier}
        password={password}
        passwordVisible={passwordVisible}
        error={error}
        loading={loading}
        onIdentifierChange={setIdentifier}
        onPasswordChange={setPassword}
        onPasswordVisibilityChange={() => setPasswordVisible((current) => !current)}
        onSubmit={submit}
      />
    );
  }

  return (
    <>
      <MarketingNavbar />
      <main
        dir="rtl"
        className="marketing-auth min-h-[calc(100svh-72px)] overflow-hidden bg-white text-slate-950 transition-colors duration-300 dark:bg-[#07111F] dark:text-slate-100"
      >
        <div className="mx-auto grid min-h-[calc(100svh-72px)] max-w-[1500px] lg:grid-cols-[0.95fr_1.05fr] xl:grid-cols-[0.92fr_1.08fr]">
          {/* FORM */}
          <section className="flex min-h-[calc(100svh-72px)] items-center px-5 py-10 sm:px-8 md:px-10 lg:px-8 lg:py-8 xl:px-14 xl:py-12 2xl:px-20">
          <div className="mx-auto w-full max-w-[390px] xl:max-w-[430px]">
            <div>
              <p className="text-sm font-black text-sky-600">
                تسجيل الدخول
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-slate-100 sm:text-[2rem] xl:mt-4 xl:text-4xl">
                مرحبًا بعودتك
              </h1>
            </div>

            {error ? (
              <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <form onSubmit={submit} className="mt-9 space-y-5">
              <AuthInput
                label="البريد الإلكتروني أو رقم الجوال"
                type="text"
                value={identifier}
                onChange={setIdentifier}
                placeholder="example@email.com أو 05XXXXXXXX"
                autoComplete="username"
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

              <a
                href={buildTeachixSupportWhatsAppUrl(TEACHIX_PASSWORD_RECOVERY_WHATSAPP_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="-mt-2 inline-flex text-sm font-black text-sky-600 transition hover:text-sky-700 hover:underline"
              >
                نسيت كلمة المرور؟
              </a>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-sky-600/10 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <BrandLoader variant="button" size="xs" label="جاري الدخول..." /> : "دخول"}

                {!loading ? (
                  <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                ) : null}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-100 pt-7 text-center dark:border-white/10">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
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
          <aside className="relative hidden overflow-hidden border-r border-slate-100 bg-[#f8fbfe] dark:border-white/10 dark:bg-[#0D1B2E] lg:flex lg:min-h-[calc(100svh-72px)] lg:items-center lg:justify-center lg:px-6 xl:px-12 2xl:px-20">
          <div className="absolute -right-40 top-8 h-[440px] w-[440px] rounded-full bg-sky-100/60 blur-3xl dark:bg-sky-500/10" />
          <div className="absolute -left-40 bottom-6 h-[360px] w-[360px] rounded-full bg-blue-50 blur-3xl dark:bg-blue-500/10" />

          <div className="relative w-full max-w-[610px]">
            <h2 className="max-w-xl text-2xl font-black leading-tight tracking-[-0.04em] text-slate-950 dark:text-slate-100 xl:text-4xl">
              أعمالك جاهزة عندما تعود.
            </h2>

            <div className="relative mx-auto mt-8 max-w-[420px] xl:mt-12 xl:max-w-[520px]">
              <div className="absolute inset-8 rounded-[3rem] bg-sky-100/70 blur-3xl dark:bg-sky-500/10" />

              <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_45px_120px_-55px_rgba(15,23,42,0.32)] dark:border-white/10 dark:bg-[#102138] dark:shadow-[0_45px_120px_-55px_rgba(0,0,0,0.7)] xl:rounded-[34px] xl:p-7">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6 dark:border-white/10">
                  <div>
                    <TeachixLogo size="sm" />

                    <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-slate-100">
                      حسابك
                    </h3>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-8 rounded-[26px] bg-slate-50 p-6 dark:bg-[#0D1B2E]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sky-600 shadow-sm dark:bg-[#102138]">
                      <UserRound className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <div className="h-3 w-28 rounded-full bg-slate-900 dark:bg-slate-200" />
                      <div className="mt-3 h-2.5 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                    </div>

                    <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
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

                <div className="mt-5 rounded-[24px] border border-sky-100 bg-sky-50/60 p-5 dark:border-white/10 dark:bg-[#0D1B2E]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 dark:bg-[#102138]">
                      <Check className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-slate-100">
                        مساحة العمل جاهزة
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">
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
    </>
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
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#102138]">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">
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
  autoComplete,
  trailingAction,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  trailingAction?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  };
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700 dark:text-slate-200">
        {label}
      </span>

      <div className="relative mt-2.5">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={[
            "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-50 dark:border-white/10 dark:bg-[#102138] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-sky-900/40",
            trailingAction ? "pl-12" : "",
          ].join(" ")}
          required
        />

        {trailingAction ? (
          <button
            type="button"
            onClick={trailingAction.onClick}
            aria-label={trailingAction.label}
            className="absolute inset-y-0 left-3 inline-flex items-center justify-center text-slate-400 transition hover:text-sky-600 dark:text-slate-500"
          >
            {trailingAction.icon}
          </button>
        ) : null}
      </div>
    </label>
  );
}
