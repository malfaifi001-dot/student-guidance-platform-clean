"use client";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  FileCheck2,
  Images,
  Mail,
  ShieldCheck,
  Timer,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { RegisterPreferencesPopCard } from "@/components/auth/register-preferences-pop-card";
import type { AccountType } from "@/components/auth/register-preferences-pop-card";

type Gender = "MALE" | "FEMALE";

const KNOWN_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
]);

function isValidEmailFormat(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasKnownEmailDomain(value: string) {
  const domain = value.split("@")[1]?.toLowerCase() || "";
  return KNOWN_EMAIL_DOMAINS.has(domain);
}

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  function validateForm() {
    const trimmedName = name.trim();

    if (trimmedName.length < 3) {
      return "الاسم يجب ألا يقل عن 3 أحرف.";
    }

    if (!isValidEmailFormat(normalizedEmail)) {
      return "أدخل بريدًا إلكترونيًا صحيحًا.";
    }

    if (!hasKnownEmailDomain(normalizedEmail)) {
      return "استخدم بريدًا من مزود معروف مثل Gmail أو Outlook أو iCloud.";
    }

    if (password.length < 8) {
      return "كلمة المرور يجب أن تكون 8 أحرف على الأقل.";
    }

    if (password !== confirmPassword) {
      return "كلمة المرور وتأكيدها غير متطابقين.";
    }

    return "";
  }

  function openPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();
    setError(validationError);

    if (validationError) {
      return;
    }

    setPreferencesOpen(true);
  }

  async function submitRegistration() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setPreferencesOpen(false);
      return;
    }

    if (!gender) {
      setError("اختر الصياغة المناسبة أولًا.");
      return;
    }

    if (!accountType) {
      setError("اختر دورك قبل إنشاء الحساب.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          password,
          confirmPassword,
          gender,
          accountType,
        }),
      });

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر إنشاء الحساب.");
      }

      window.location.href = data.redirectTo || "/dashboard";
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main
        dir="rtl"
        style={{ background: "#eef7fb" }}
        className="min-h-screen px-4 py-8 sm:px-6 lg:px-10"
      >
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1180px] items-center justify-center">
          <div
            dir="ltr"
            className="flex w-full overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_34px_100px_-70px_rgba(15,23,42,0.75)] lg:min-h-[610px] lg:flex-row"
          >
            <aside
              dir="rtl"
              className="relative flex min-h-[610px] flex-1 overflow-hidden bg-[linear-gradient(135deg,#0284c7_0%,#2563eb_52%,#1e3a8a_100%)] p-9 text-white"
            >
              <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute -bottom-32 left-6 h-80 w-80 rounded-full bg-cyan-200/18 blur-3xl" />

              <div className="relative flex w-full flex-col justify-between">
                <div className="text-right">
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-xs font-black text-sky-50 ring-1 ring-white/15">
                    <Timer className="h-4 w-4" />
                    جاهز للعمل اليومي
                  </p>

                  <h2 className="mt-8 text-[2.7rem] font-black leading-[1.18] tracking-tight text-white xl:text-[3.35rem]">
                    تقريرك والشواهد
                    <br />
                    في 60 ثانية!
                  </h2>
                </div>

                <div className="mt-12 grid gap-3 opacity-90 lg:grid-cols-[1fr_0.74fr]">
                  <div className="rounded-[1.35rem] bg-white p-3 text-slate-950 shadow-[0_20px_60px_-44px_rgba(15,23,42,0.45)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black text-sky-700">معاينة تقرير</p>
                        <p className="mt-1 text-base font-black text-slate-950">بطاقة تنفيذ جاهزة</p>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                        <FileCheck2 className="h-5 w-5" />
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
                      icon={<Images className="h-4 w-4" />}
                      title="الشواهد"
                      value="4 صور"
                    />
                    <MetricCard
                      icon={<ShieldCheck className="h-4 w-4" />}
                      title="التوثيق"
                      value="جاهز"
                    />
                    <MetricCard
                      icon={<Mail className="h-4 w-4" />}
                      title="المشاركة"
                      value="فورية"
                    />
                  </div>
                </div>
              </div>
            </aside>

            <form
              dir="rtl"
              onSubmit={openPreferences}
              className="flex min-h-[610px] flex-1 items-center justify-center bg-white px-7 py-10"
            >
              <div className="w-full max-w-[330px]">
                <h1 className="text-right text-[1.55rem] font-black leading-[1.25] tracking-tight text-slate-950 sm:text-[1.8rem]">
                  أنشئ حسابك الآن
                </h1>

                {error ? (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="mt-7 space-y-3.5">
                  <AuthInput label="الاسم الكامل" value={name} onChange={setName} />

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
                      icon: passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
                      onClick: () => setPasswordVisible((current) => !current),
                    }}
                  />

                  <p className="-mt-2 px-1 text-[0.68rem] font-bold text-slate-300">
                    8 أحرف على الأقل
                  </p>

                  <AuthInput
                    label="تأكيد كلمة المرور"
                    type={confirmPasswordVisible ? "text" : "password"}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    trailingAction={{
                      label: confirmPasswordVisible
                        ? "إخفاء تأكيد كلمة المرور"
                        : "إظهار تأكيد كلمة المرور",
                      icon: confirmPasswordVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      ),
                      onClick: () => setConfirmPasswordVisible((current) => !current),
                    }}
                  />

                  <button className="group mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-[0_18px_38px_-28px_rgba(2,132,199,0.8)] transition hover:bg-sky-700">
                    إنشاء الحساب
                    <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                  </button>

                  <a
                    href="/login"
                    className="block text-center text-sm font-bold text-slate-500 transition hover:text-sky-700"
                  >
                    لدي حساب بالفعل
                  </a>
                </div>
              </div>
            </form>
          </div>
        </section>
      </main>

      <RegisterPreferencesPopCard
        open={preferencesOpen}
        selectedGender={gender}
        selectedRole={accountType}
        loading={loading}
        errorMessage={error}
        onClose={() => {
          if (loading) {
            return;
          }

          setPreferencesOpen(false);
        }}
        onSelectGender={(value) => {
          setGender(value);
          setAccountType(null);
          setError("");
        }}
        onSelectRole={(value) => {
          setAccountType(value);
          setError("");
        }}
        onConfirm={submitRegistration}
      />
    </>
  );
}

function MetricCard({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
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
          <p className="text-[0.68rem] font-bold text-sky-50/65">{title}</p>
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
    <div className="aspect-square rounded-2xl bg-[linear-gradient(135deg,#e0f2fe_0%,#bfdbfe_100%)] ring-1 ring-sky-100" />
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
    icon: ReactNode;
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
            "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 outline-none transition placeholder:text-sm placeholder:font-bold placeholder:text-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100",
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
            className="absolute inset-y-0 left-3 inline-flex items-center justify-center text-slate-400 transition hover:text-sky-700"
          >
            {trailingAction.icon}
          </button>
        ) : null}
      </div>
    </label>
  );
}
