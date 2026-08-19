import Link from "next/link";
import { ArrowLeft, CircleAlert, Eye, EyeOff, X } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { RegisterPreferencesPopCard } from "@/components/auth/register-preferences-pop-card";
import type { AccountType } from "@/components/auth/register-preferences-pop-card";
import { NativeAuthBrand } from "@/components/auth/native-auth-brand";
import { openNativeOnboardingReview } from "@/lib/native/native-onboarding";

type Gender = "MALE" | "FEMALE";
type LegalDocument = "terms" | "privacy";

type NativeRegisterShellProps = {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  gender: Gender | null;
  accountType: AccountType | null;
  preferencesOpen: boolean;
  passwordVisible: boolean;
  confirmPasswordVisible: boolean;
  error: string;
  loading: boolean;
  acceptedTerms: boolean;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordVisibilityChange: () => void;
  onConfirmPasswordVisibilityChange: () => void;
  onAcceptedTermsChange: (value: boolean) => void;
  onOpenPreferences: (event: FormEvent<HTMLFormElement>) => void;
  onClosePreferences: () => void;
  onSelectGender: (value: Gender) => void;
  onSelectRole: (value: AccountType) => void;
  onConfirmRegistration: () => void;
};

export function NativeRegisterShell({
  name,
  phone,
  password,
  confirmPassword,
  gender,
  accountType,
  preferencesOpen,
  passwordVisible,
  confirmPasswordVisible,
  error,
  loading,
  acceptedTerms,
  onNameChange,
  onPhoneChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onPasswordVisibilityChange,
  onConfirmPasswordVisibilityChange,
  onAcceptedTermsChange,
  onOpenPreferences,
  onClosePreferences,
  onSelectGender,
  onSelectRole,
  onConfirmRegistration,
}: NativeRegisterShellProps) {
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);

  return (
    <>
      <main
        dir="rtl"
        className="min-h-[100dvh] overflow-y-auto bg-slate-50 text-slate-950 dark:bg-[#07111F] dark:text-white"
        style={{
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col justify-start px-5 py-6 sm:px-8 sm:py-8">
          <div className="relative rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[#102138] sm:p-6">
            <button
              type="button"
              onClick={() => openNativeOnboardingReview("/register")}
              aria-label="استعراض مميزات Teachix"
              className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-sky-600 transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-600/30 dark:border-white/15 dark:text-blue-200 dark:hover:bg-white/10"
            >
              <CircleAlert className="h-5 w-5" aria-hidden="true" />
            </button>

            <NativeAuthBrand
              hideTitle
              title="إنشاء حساب"
              description="أنشئ حسابك في Teachix وابدأ بتنظيم أعمالك بسهولة."
            />

            {error ? (
              <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <form onSubmit={onOpenPreferences} className="mt-6 space-y-3.5">
              <NativeInput id="native-register-name" label="الاسم الكامل" value={name} onChange={onNameChange} autoComplete="name" />
              <NativeInput id="native-register-phone" label="رقم الجوال" type="tel" value={phone} onChange={onPhoneChange} placeholder="05XXXXXXXX" inputMode="numeric" maxLength={10} autoComplete="tel" dir="ltr" />
              <NativeInput
                id="native-register-password"
                label="كلمة المرور"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={onPasswordChange}
                autoComplete="new-password"
                dir="ltr"
                trailingAction={{ label: passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور", onClick: onPasswordVisibilityChange, icon: passwordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" /> }}
              />
              <p className="-mt-1 px-1 text-[13px] font-semibold leading-5 text-slate-400">8 أحرف على الأقل</p>
              <NativeInput
                id="native-register-confirm-password"
                label="تأكيد كلمة المرور"
                type={confirmPasswordVisible ? "text" : "password"}
                value={confirmPassword}
                onChange={onConfirmPasswordChange}
                autoComplete="new-password"
                dir="ltr"
                trailingAction={{ label: confirmPasswordVisible ? "إخفاء التأكيد" : "إظهار التأكيد", onClick: onConfirmPasswordVisibilityChange, icon: confirmPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" /> }}
              />

              <label className="flex min-h-11 items-start gap-3 px-1 text-[13px] font-medium leading-5 text-slate-500 dark:text-slate-300">
                <input type="checkbox" checked={acceptedTerms} onChange={(event) => onAcceptedTermsChange(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-600" />
                <span>
                  أوافق على{" "}
                  <button
                    type="button"
                    onClick={() => setLegalDocument("terms")}
                    className="text-sky-600 underline-offset-2 hover:underline"
                  >
                    الشروط والأحكام
                  </button>{" "}
                  و{" "}
                  <button
                    type="button"
                    onClick={() => setLegalDocument("privacy")}
                    className="text-sky-600 underline-offset-2 hover:underline"
                  >
                    سياسة الخصوصية
                  </button>
                </span>
              </label>

              <button type="submit" className="mt-1 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 text-base font-black text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700">
                متابعة إنشاء الحساب <ArrowLeft className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4 text-center dark:border-white/10">
              <p className="hidden">لديك حساب بالفعل؟</p>
              <Link href="/login" className="mt-0 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-sky-600">
                تسجيل الدخول <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {legalDocument ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5"
          style={{
            paddingTop: "max(0.75rem, env(safe-area-inset-top))",
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
          onClick={() => setLegalDocument(null)}
        >
          <section
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="native-register-legal-title"
            className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#102138] sm:max-h-[calc(100dvh-2.5rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
              <h2 id="native-register-legal-title" className="text-lg font-black text-slate-950 dark:text-white">
                {legalDocument === "terms" ? "الشروط والأحكام" : "سياسة الخصوصية"}
              </h2>
              <button
                type="button"
                onClick={() => setLegalDocument(null)}
                aria-label="إغلاق"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600/30 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <iframe
              title={legalDocument === "terms" ? "الشروط والأحكام" : "سياسة الخصوصية"}
              src={`/${legalDocument}`}
              className="min-h-[60dvh] w-full flex-1 border-0 bg-white dark:bg-[#07111F] sm:min-h-[65dvh]"
            />
          </section>
        </div>
      ) : null}

      <RegisterPreferencesPopCard
        open={preferencesOpen}
        selectedGender={gender}
        selectedRole={accountType}
        loading={loading}
        errorMessage={error}
        onClose={onClosePreferences}
        onSelectGender={onSelectGender}
        onSelectRole={onSelectRole}
        onConfirm={onConfirmRegistration}
      />
    </>
  );
}

type NativeInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: "numeric" | "text" | "tel";
  maxLength?: number;
  autoComplete?: string;
  dir?: "ltr" | "rtl" | "auto";
  trailingAction?: { label: string; icon: React.ReactNode; onClick: () => void };
};

function NativeInput({ id, label, value, onChange, type = "text", placeholder, inputMode, maxLength, autoComplete, dir = "auto", trailingAction }: NativeInputProps) {
  return (
    <label className="block text-[14px] font-semibold leading-5 text-slate-700 dark:text-slate-200" htmlFor={id}>
      {label}
      <span className="relative mt-2 block">
        <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} maxLength={maxLength} autoComplete={autoComplete} dir={dir} className={["min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10 dark:border-white/10 dark:bg-[#0D1B2E] dark:text-white dark:placeholder:text-slate-500", trailingAction ? "pl-14" : ""].join(" ")} />
        {trailingAction ? (
          <button type="button" onClick={trailingAction.onClick} aria-label={trailingAction.label} className="absolute left-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/70 dark:hover:bg-white/10 dark:hover:text-white">
            {trailingAction.icon}
          </button>
        ) : null}
      </span>
    </label>
  );
}
