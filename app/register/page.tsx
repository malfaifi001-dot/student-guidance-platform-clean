"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  School,
  Trophy,
  UsersRound,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { TeachixLogo } from "@/components/brand/teachix-logo";

import { RegisterPreferencesPopCard } from "@/components/auth/register-preferences-pop-card";
import type { AccountType } from "@/components/auth/register-preferences-pop-card";
import {
  isValidSaudiMobile,
  normalizeSaudiMobile,
  SAUDI_MOBILE_ERROR,
} from "@/lib/auth/login-identifier";

type Gender = "MALE" | "FEMALE";

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  function validateForm() {
    const trimmedName = name.trim();

    if (trimmedName.length < 3) {
      return "الاسم يجب ألا يقل عن 3 أحرف.";
    }

    if (!isValidSaudiMobile(phone)) {
      return SAUDI_MOBILE_ERROR;
    }

    if (password.length < 8) {
      return "كلمة المرور يجب أن تكون 8 أحرف على الأقل.";
    }

    if (password !== confirmPassword) {
      return "كلمة المرور وتأكيدها غير متطابقين.";
    }

    if (!acceptedTerms) {
      return "يجب الموافقة على الشروط والأحكام وسياسة الاستخدام للمتابعة.";
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
          phone: normalizeSaudiMobile(phone),
          password,
          confirmPassword,
          gender,
          accountType,
          acceptedTerms,
        }),
      });

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر إنشاء الحساب.");
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
    <>
      <MarketingNavbar />
      <main
        dir="rtl"
        className="min-h-[calc(100svh-72px)] overflow-hidden bg-white text-slate-950"
      >
        <div className="mx-auto grid min-h-[calc(100svh-72px)] max-w-[1500px] lg:grid-cols-[0.95fr_1.05fr] xl:grid-cols-[0.92fr_1.08fr]">
          {/* FORM */}
          <section className="flex min-h-[calc(100svh-72px)] items-center px-5 py-10 sm:px-8 md:px-10 lg:px-8 lg:py-8 xl:px-14 xl:py-12 2xl:px-20">
            <div className="mx-auto w-full max-w-[390px] xl:max-w-[430px]">
              <div>
                <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-[2rem] xl:text-4xl">
                  ابدأ مع Teachix
                </h1>
              </div>

              {error ? (
                <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              ) : null}

              <form
                onSubmit={openPreferences}
                className="mt-9 space-y-4"
              >
                <AuthInput
                  label="الاسم الكامل"
                  value={name}
                  onChange={setName}
                />

                <AuthInput
                  label="رقم الجوال"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="05XXXXXXXX"
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel"
                  dir="ltr"
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

                <p className="-mt-1 px-1 text-[11px] font-bold text-slate-400">
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
                    onClick: () =>
                      setConfirmPasswordVisible((current) => !current),
                  }}
                />

                <label className="flex items-start gap-2 px-1 text-xs font-bold leading-6 text-slate-500">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => {
                      setAcceptedTerms(event.target.checked);
                      setError("");
                    }}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>
                    أوافق على{" "}
                    <Link href="/terms" className="text-sky-700 underline-offset-2 hover:underline">
                      الشروط والأحكام
                    </Link>{" "}
                    و
                    <Link href="/privacy" className="text-sky-700 underline-offset-2 hover:underline">
                      سياسة الاستخدام
                    </Link>
                  </span>
                </label>

                <button
                  type="submit"
                  className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-sky-600/10 transition hover:bg-sky-700"
                >
                  متابعة إنشاء الحساب
                  <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                </button>
              </form>

              <div className="mt-7 border-t border-slate-100 pt-7 text-center">
                <p className="text-sm font-bold text-slate-500">
                  لديك حساب بالفعل؟
                </p>

                <Link
                  href="/login"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-black text-sky-600 transition hover:text-sky-700"
                >
                  تسجيل الدخول
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* REGISTER VISUAL */}
          <aside className="relative hidden overflow-hidden border-r border-slate-100 bg-[#eef6ff] lg:flex lg:min-h-[calc(100svh-72px)] lg:items-center lg:justify-center lg:px-6 xl:px-12 2xl:px-20">
            <div className="absolute -right-36 top-8 h-[420px] w-[420px] rounded-full bg-sky-100/60 blur-3xl" />
            <div className="absolute -left-40 bottom-8 h-[360px] w-[360px] rounded-full bg-blue-50 blur-3xl" />

            <div className="relative w-full max-w-[610px]">
              <h2 className="max-w-xl text-2xl font-black leading-tight tracking-[-0.04em] text-slate-950 xl:text-4xl">
                كل دور له مساحة عمل تناسبه.
              </h2>

              <div className="relative mx-auto mt-8 max-w-[430px] xl:mt-12 xl:max-w-[540px]">
                <div className="absolute inset-8 rounded-[3rem] bg-sky-100/70 blur-3xl" />

                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_45px_120px_-55px_rgba(15,23,42,0.32)] xl:rounded-[34px] xl:p-7">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <div>
                      <TeachixLogo size="sm" />

                      <h3 className="mt-1 text-xl font-black text-slate-950">
                        اختر مساحتك
                      </h3>
                    </div>

                    <div className="rounded-full bg-sky-50 px-4 py-2 text-xs font-black text-sky-700">
                      خطوة واحدة
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-4">
                    <RoleCard
                      icon={<GraduationCap className="h-5 w-5" />}
                      title="المعلم"
                    />

                    <RoleCard
                      icon={<UsersRound className="h-5 w-5" />}
                      title="الموجه الطلابي"
                    />

                    <RoleCard
                      icon={<School className="h-5 w-5" />}
                      title="مدير المدرسة"
                    />

                    <RoleCard
                      icon={<Trophy className="h-5 w-5" />}
                      title="رائد النشاط"
                    />
                  </div>

                  <div className="mt-5 rounded-[24px] border border-sky-100 bg-sky-50/60 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600">
                        <Check className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-slate-950">
                          الخدمات تتغير حسب دورك
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-400">
                          وتظهر لك الأدوات التي تحتاجها فقط
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

function RoleCard({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
        {icon}
      </div>

      <p className="mt-5 text-sm font-black text-slate-950">
        {title}
      </p>

      <div className="mt-3 h-2 w-16 rounded-full bg-slate-200" />
    </div>
  );
}

function AuthInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
  maxLength,
  autoComplete,
  dir,
  trailingAction,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: "numeric" | "text" | "tel";
  maxLength?: number;
  autoComplete?: string;
  dir?: "ltr" | "rtl";
  trailingAction?: {
    label: string;
    icon: ReactNode;
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
          inputMode={inputMode}
          maxLength={maxLength}
          autoComplete={autoComplete}
          dir={dir}
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
