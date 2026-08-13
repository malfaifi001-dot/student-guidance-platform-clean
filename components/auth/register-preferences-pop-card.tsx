"use client";

import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  HeartHandshake,
  School,
  Mars,
  Sparkles,
  Trophy,
  Venus,
  X,
} from "lucide-react";

import { BrandLoader } from "@/components/common/brand-loader";

type Gender = "MALE" | "FEMALE";
export type AccountType = "COUNSELOR" | "ACTIVITY_LEADER" | "TEACHER" | "PRINCIPAL";

type RegisterPreferencesPopCardProps = {
  open: boolean;
  selectedGender: Gender | null;
  selectedRole: AccountType | null;
  loading: boolean;
  errorMessage: string;
  onClose: () => void;
  onSelectGender: (gender: Gender) => void;
  onSelectRole: (role: AccountType) => void;
  onConfirm: () => void;
};

type RoleOption = {
  value: AccountType;
  title: string;
  icon: LucideIcon;
};

const roleOptionsByGender: Record<Gender, RoleOption[]> = {
  MALE: [
    {
      value: "TEACHER",
      title: "معلم",
      icon: GraduationCap,
    },
    {
      value: "COUNSELOR",
      title: "موجه طلابي",
      icon: HeartHandshake,
    },
    {
      value: "ACTIVITY_LEADER",
      title: "رائد نشاط",
      icon: Trophy,
    },
    { value: "PRINCIPAL", title: "مدير مدرسة", icon: School },
  ],
  FEMALE: [
    {
      value: "TEACHER",
      title: "معلمة",
      icon: GraduationCap,
    },
    {
      value: "COUNSELOR",
      title: "موجهة طلابية",
      icon: HeartHandshake,
    },
    {
      value: "ACTIVITY_LEADER",
      title: "رائدة نشاط",
      icon: Sparkles,
    },
    { value: "PRINCIPAL", title: "مديرة مدرسة", icon: School },
  ],
};

export function RegisterPreferencesPopCard({
  open,
  selectedGender,
  selectedRole,
  loading,
  errorMessage,
  onClose,
  onSelectGender,
  onSelectRole,
  onConfirm,
}: RegisterPreferencesPopCardProps) {
  if (!open) {
    return null;
  }

  const roleOptions = selectedGender ? roleOptionsByGender[selectedGender] : [];
  const canConfirm = Boolean(selectedGender && selectedRole && !loading);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={loading ? undefined : onClose}
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white/95 p-5 shadow-[0_34px_100px_-52px_rgba(15,23,42,0.38)] backdrop-blur sm:p-6">
        <div className="relative text-center">
          <div className="px-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
              <Sparkles className="h-3.5 w-3.5" />
              خطوة أخيرة قبل الدخول
            </span>

            <h2 className="mt-3 text-[1.55rem] font-black text-slate-950">
              اختر الصياغة المناسبة
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              اختر الصياغة أولًا، ثم سيظهر لك قسم الدور المناسب داخل البطاقة نفسها.
            </p>
          </div>

          <button
            type="button"
            onClick={loading ? undefined : onClose}
            className="absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="إغلاق"
            disabled={loading}
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PreferenceCard
            active={selectedGender === "MALE"}
            title="ذكر"
            icon={Mars}
            onClick={() => onSelectGender("MALE")}
          />

          <PreferenceCard
            active={selectedGender === "FEMALE"}
            title="أنثى"
            icon={Venus}
            onClick={() => onSelectGender("FEMALE")}
          />
        </div>

        <div
          className={[
            "overflow-hidden transition-all duration-300 ease-out",
            selectedGender ? "mt-4 max-h-[360px] opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
        >
          <div className="rounded-[1.5rem] border border-sky-100 bg-[linear-gradient(180deg,_#f8fcff_0%,_#eff8ff_100%)] px-4 py-4 shadow-[0_18px_60px_-48px_rgba(14,165,233,0.55)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-900">اختر دورك داخل المنصة</p>

              <div className="rounded-2xl bg-white/80 px-3 py-2 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                {selectedGender === "FEMALE" ? "أنثى" : "ذكر"}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {roleOptions.map((option) => (
                <PreferenceCard
                  key={option.value}
                  active={selectedRole === option.value}
                  compact
                  title={option.title}
                  icon={option.icon}
                  onClick={() => onSelectRole(option.value)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold leading-6 text-slate-400">
            لن يتم إنشاء الحساب حتى تحدد الصياغة والدور المناسبين.
          </p>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={[
              "inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-black transition sm:w-auto sm:min-w-[180px]",
              canConfirm
                ? "bg-sky-600 text-white shadow-[0_18px_40px_-24px_rgba(2,132,199,0.75)] hover:bg-sky-700"
                : "cursor-not-allowed bg-slate-200 text-slate-500",
            ].join(" ")}
          >
            {loading
              ? <BrandLoader variant="button" size="xs" label="جاري إنشاء الحساب..." />
              : selectedRole === "PRINCIPAL"
                ? `إنشاء حساب ${selectedGender === "FEMALE" ? "مديرة المدرسة" : "مدير المدرسة"}`
                : "تأكيد وإنشاء الحساب"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreferenceCard({
  active,
  title,
  icon: Icon,
  onClick,
  compact = false,
}: {
  active: boolean;
  title: string;
  icon: LucideIcon;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-3xl border text-center transition",
        compact ? "min-h-[88px] px-4 py-4" : "min-h-[92px] px-4 py-4",
        active
          ? "border-sky-400 bg-sky-50 text-sky-900 ring-4 ring-sky-100 shadow-[0_20px_60px_-48px_rgba(14,165,233,0.75)]"
          : "border-slate-200 bg-white text-slate-800 hover:border-sky-200 hover:bg-sky-50/60",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto flex items-center justify-center rounded-2xl",
          compact ? "h-10 w-10" : "h-10 w-10",
          active ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-700",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </div>

      <span className={["block font-black", compact ? "mt-2.5 text-sm" : "mt-2.5 text-base"].join(" ")}>
        {title}
      </span>
    </button>
  );
}
