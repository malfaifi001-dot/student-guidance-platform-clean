import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

import { BrandLoader } from "@/components/common/brand-loader";
import { NativeAuthBrand } from "@/components/auth/native-auth-brand";

type NativeLoginShellProps = {
  identifier: string;
  password: string;
  passwordVisible: boolean;
  error: string;
  loading: boolean;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordVisibilityChange: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function NativeLoginShell({
  identifier,
  password,
  passwordVisible,
  error,
  loading,
  onIdentifierChange,
  onPasswordChange,
  onPasswordVisibilityChange,
  onSubmit,
}: NativeLoginShellProps) {
  return (
    <main
      dir="rtl"
      className="min-h-[100dvh] overflow-y-auto bg-slate-50 text-slate-950 dark:bg-[#07111F] dark:text-white"
      style={{
        paddingTop: "max(1.25rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col justify-center px-5 py-8 sm:px-8">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[#102138] sm:p-8">
          <NativeAuthBrand
            title="تسجيل الدخول"
            description="مرحبًا بعودتك، سجّل الدخول للمتابعة إلى حسابك."
          />

          {error ? (
            <div
              role="alert"
              className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <label className="block text-sm font-black text-slate-700 dark:text-slate-200" htmlFor="native-login-identifier">
              البريد الإلكتروني أو رقم الجوال
              <input
                id="native-login-identifier"
                type="text"
                value={identifier}
                onChange={(event) => onIdentifierChange(event.target.value)}
                placeholder="example@email.com أو 05XXXXXXXX"
                autoComplete="username"
                dir="auto"
                className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1769FF] focus:ring-4 focus:ring-[#1769FF]/10 dark:border-white/10 dark:bg-[#0D1B2E] dark:text-white dark:placeholder:text-slate-500"
              />
            </label>

            <label className="block text-sm font-black text-slate-700 dark:text-slate-200" htmlFor="native-login-password">
              كلمة المرور
              <span className="relative mt-2 block">
                <input
                  id="native-login-password"
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  autoComplete="current-password"
                  dir="ltr"
                  className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-14 text-base font-semibold text-slate-950 outline-none transition focus:border-[#1769FF] focus:ring-4 focus:ring-[#1769FF]/10 dark:border-white/10 dark:bg-[#0D1B2E] dark:text-white"
                />
                <button
                  type="button"
                  onClick={onPasswordVisibilityChange}
                  aria-label={passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  className="absolute left-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {passwordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
            </label>

            <div className="flex items-center justify-start">
              <Link href="/forgot-password" className="text-sm font-bold text-[#1769FF] underline-offset-4 hover:underline">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1769FF] px-6 text-sm font-black text-white shadow-lg shadow-[#1769FF]/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <BrandLoader variant="button" size="xs" label="جاري الدخول..." /> : "تسجيل الدخول"}
              {!loading ? <ArrowLeft className="h-4 w-4" /> : null}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center dark:border-white/10">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-300">ليس لديك حساب؟</p>
            <Link href="/register" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-black text-[#1769FF]">
              إنشاء حساب <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
