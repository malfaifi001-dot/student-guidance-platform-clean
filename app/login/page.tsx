"use client";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  FileText,
  Layers3,
  ShieldCheck,
  Sparkles,
  Timer,
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
      setError(requestError instanceof Error ? requestError.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      style={{ background: "#eef7fb" }}
      className="min-h-screen px-4 py-8 sm:px-6 lg:px-10"
    >
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1180px] items-center justify-center">
        <div
          dir="ltr"
          className="flex w-full overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_34px_100px_-70px_rgba(15,23,42,0.75)] lg:min-h-[560px] lg:flex-row"
        >
          <aside
            dir="rtl"
            className="relative flex min-h-[520px] flex-1 overflow-hidden bg-[linear-gradient(135deg,#0f766e_0%,#059669_48%,#064e3b_100%)] p-8 text-white"
          >
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-32 left-6 h-80 w-80 rounded-full bg-emerald-200/18 blur-3xl" />

            <div className="relative flex w-full flex-col justify-between">
              <div className="text-right">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-xs font-black text-emerald-50 ring-1 ring-white/15">
                  <Timer className="h-4 w-4" />
                  دخول سريع للوحة العمل
                </p>

                <h1 className="mt-7 text-[2.75rem] font-black leading-[1.18] tracking-tight text-white xl:text-[3.35rem]">
                  تقارير مخصصة
                  <br />
                  لعملك اليومي
                </h1>
              </div>

              <div className="mt-9 grid gap-3 opacity-90 lg:grid-cols-[1fr_0.74fr]">
                <div className="rounded-[1.35rem] bg-white p-3 text-slate-950 shadow-[0_20px_60px_-44px_rgba(15,23,42,0.45)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black text-emerald-700">مساحة العمل</p>
                      <p className="mt-1 text-base font-black text-slate-950">
                        لوحة تقارير جاهزة
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <PreviewLine width="w-11/12" />
                    <PreviewLine width="w-8/12" />
                    <PreviewLine width="w-10/12" />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <PreviewBox />
                    <PreviewBox />
                    <PreviewBox />
                  </div>
                </div>

                <div className="space-y-3">
                  <MetricCard
                    icon={<Layers3 className="h-4 w-4" />}
                    title="اللوحات"
                    value="منظمة"
                  />
                  <MetricCard
                    icon={<ShieldCheck className="h-4 w-4" />}
                    title="الجلسة"
                    value="آمنة"
                  />
                  <MetricCard
                    icon={<Sparkles className="h-4 w-4" />}
                    title="التجربة"
                    value="سريعة"
                  />
                </div>
              </div>
            </div>
          </aside>

          <form
            dir="rtl"
            onSubmit={submit}
            className="flex min-h-[520px] flex-1 items-center justify-center bg-white px-7 py-10"
          >
            <div className="w-full max-w-[330px]">

              <h2 className="text-right text-[1.8rem] font-black leading-[1.25] tracking-tight text-slate-950 sm:text-[2.05rem]">
                مرحبًا بعودتك
              </h2>

              {error ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-7 space-y-3.5">
                <AuthInput
                  label="البريد الإلكتروني"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="name@gmail.com"
                />

                <AuthInput
                  label="كلمة المرور"
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  trailingAction={{
                    label: passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور",
                    icon: passwordVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    ),
                    onClick: () => setPasswordVisible((current) => !current),
                  }}
                />

                <button
                  disabled={loading}
                  className="group mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-[0_18px_38px_-28px_rgba(5,150,105,0.78)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "جاري الدخول..." : "دخول"}
                  <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                </button>

                <a
                  href="/register"
                  className="block text-center text-sm font-bold text-slate-500 transition hover:text-emerald-700"
                >
                  إنشاء حساب جديد
                </a>
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] bg-white/12 p-2.5 ring-1 ring-white/15 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white">
          {icon}
        </div>

        <div className="text-right">
          <p className="text-[0.68rem] font-bold text-emerald-50/65">{title}</p>
          <p className="mt-0.5 text-sm font-black text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function PreviewLine({ width }: { width: string }) {
  return <div className={["h-2 rounded-full bg-slate-100", width].join(" ")} />;
}

function PreviewBox() {
  return (
    <div className="aspect-square rounded-2xl bg-[linear-gradient(135deg,#d1fae5_0%,#bbf7d0_100%)] ring-1 ring-emerald-100" />
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
      <span className="text-xs font-black text-slate-700">{label}</span>

      <div className="relative mt-2">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={[
            "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 outline-none transition placeholder:text-sm placeholder:font-bold placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100",
            trailingAction ? "pl-12" : "",
          ].join(" ")}
          required
        />

        {trailingAction ? (
          <button
            type="button"
            onClick={trailingAction.onClick}
            aria-label={trailingAction.label}
            aria-pressed={type === "text"}
            className="absolute inset-y-0 left-3 inline-flex items-center justify-center text-slate-400 transition hover:text-emerald-700"
          >
            {trailingAction.icon}
          </button>
        ) : null}
      </div>
    </label>
  );
}