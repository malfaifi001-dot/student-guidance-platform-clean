import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import type { FormEvent } from "react";

import { RegisterPreferencesPopCard } from "@/components/auth/register-preferences-pop-card";
import type { AccountType } from "@/components/auth/register-preferences-pop-card";
import { NativeAuthBrand } from "@/components/auth/native-auth-brand";

type Gender = "MALE" | "FEMALE";

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
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col justify-center px-5 py-8 sm:px-8">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[#102138] sm:p-7">
            <NativeAuthBrand
              title="إنشاء حساب"
              description="أنشئ حسابك في Teachix وابدأ بتنظيم أعمالك بسهولة."
            />

            {error ? (
              <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <form onSubmit={onOpenPreferences} className="mt-7 space-y-3.5">
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
              <p className="px-1 text-xs font-bold text-slate-400">8 أحرف على الأقل</p>
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

              <label className="flex items-start gap-3 px-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">
                <input type="checkbox" checked={acceptedTerms} onChange={(event) => onAcceptedTermsChange(event.target.checked)} className="mt-1 h-5 w-5 rounded border-slate-300 text-[#1769FF] focus:ring-[#1769FF]" />
                <span>
                  أوافق على <Link href="/terms" className="text-[#1769FF] underline-offset-2 hover:underline">الشروط والأحكام</Link> و<Link href="/privacy" className="text-[#1769FF] underline-offset-2 hover:underline"> سياسة الاستخدام</Link>
                </span>
              </label>

              <button type="submit" className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1769FF] px-6 text-sm font-black text-white shadow-lg shadow-[#1769FF]/20 transition hover:bg-blue-700">
                متابعة إنشاء الحساب <ArrowLeft className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-8 border-t border-slate-100 pt-6 text-center dark:border-white/10">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-300">لديك حساب بالفعل؟</p>
              <Link href="/login" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-black text-[#1769FF]">
                تسجيل الدخول <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

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
    <label className="block text-sm font-black text-slate-700 dark:text-slate-200" htmlFor={id}>
      {label}
      <span className="relative mt-2 block">
        <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} maxLength={maxLength} autoComplete={autoComplete} dir={dir} className={["min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1769FF] focus:ring-4 focus:ring-[#1769FF]/10 dark:border-white/10 dark:bg-[#0D1B2E] dark:text-white dark:placeholder:text-slate-500", trailingAction ? "pl-14" : ""].join(" ")} />
        {trailingAction ? (
          <button type="button" onClick={trailingAction.onClick} aria-label={trailingAction.label} className="absolute left-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/70 dark:hover:bg-white/10 dark:hover:text-white">
            {trailingAction.icon}
          </button>
        ) : null}
      </span>
    </label>
  );
}
