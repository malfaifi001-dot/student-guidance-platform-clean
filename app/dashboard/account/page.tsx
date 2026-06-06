"use client";

import { useEffect, useState } from "react";
import Link from "next/link";



type AccountUser = {
  id: string;
  name: string;
  officialName: string | null;
  email: string;
  phone: string | null;
  role: string;
  gender: string | null;
  jobTitle: string | null;
  schoolAccountId: string | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  onboardingSkippedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SubscriptionInfo = {
  subscription?: {
    status: string;
    startsAt?: string | null;
    endsAt?: string | null;
    planName?: string | null;
  };
  remainingDays?: number | null;
  usable?: boolean;
};

function roleLabel(role: string) {
  if (role === "ADMIN") return "مدير النظام";
  if (role === "COUNSELOR") return "موجه طلابي";
  if (role === "SCHOOL_OWNER") return "مالك مدرسة";
  if (role === "STAFF") return "موظف";
  return role;
}

function genderLabel(gender: string | null) {
  if (gender === "MALE") return "ذكر";
  if (gender === "FEMALE") return "أنثى";
  return "غير محدد";
}

function subscriptionStatusLabel(status?: string) {
  if (status === "TRIAL") return "تجريبي";
  if (status === "ACTIVE") return "نشط";
  if (status === "PAST_DUE") return "متعثر";
  if (status === "CANCELED") return "ملغي";
  if (status === "EXPIRED") return "منتهي";
  return status || "غير محدد";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function readJson(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export default function DashboardAccountPage() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loggingOutOthers, setLoggingOutOthers] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    officialName: "",
    phone: "",
    jobTitle: "",
    gender: "UNKNOWN",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  async function loadPage() {
    setLoading(true);
    setMessage(null);

    try {
      const [accountResponse, subscriptionResponse] = await Promise.all([
        fetch("/api/dashboard/account", { cache: "no-store" }),
        fetch("/api/dashboard/subscription", { cache: "no-store" }),
      ]);

      const accountResult = await readJson(accountResponse);
      const subscriptionResult = await readJson(subscriptionResponse);

      if (!accountResponse.ok) {
        throw new Error(accountResult.error || "تعذر تحميل بيانات الحساب.");
      }

      const nextUser = accountResult.user as AccountUser;

      setUser(nextUser);
      setProfileForm({
        name: nextUser.name || "",
        officialName: nextUser.officialName || nextUser.name || "",
        phone: nextUser.phone || "",
        jobTitle: nextUser.jobTitle || "",
        gender: nextUser.gender || "UNKNOWN",
      });

      if (subscriptionResponse.ok) {
        setSubscription(subscriptionResult);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل صفحة الحساب.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });

      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر حفظ بيانات الحساب.");
      }

      setUser(result.user);
      setMessage(result.message || "تم حفظ بيانات الحساب بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ بيانات الحساب.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("كلمة المرور الجديدة وتأكيدها غير متطابقين.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.");
      return;
    }

    setSavingPassword(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/account/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر تغيير كلمة المرور.");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setMessage(result.message || "تم تغيير كلمة المرور بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تغيير كلمة المرور.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function logoutOtherSessions() {
    setLoggingOutOthers(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/account/sessions/logout-others", {
        method: "POST",
      });

      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر تسجيل الخروج من الأجهزة الأخرى.");
      }

      setMessage(result.message || "تم تسجيل الخروج من الأجهزة الأخرى بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تنفيذ العملية.");
    } finally {
      setLoggingOutOthers(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-right" dir="rtl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-600 to-emerald-500 shadow-lg shadow-sky-100">
            <span className="text-2xl font-black text-white">ت</span>
          </div>
          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="h-3 w-3 animate-bounce rounded-full bg-sky-600 [animation-delay:-0.25s]" />
            <span className="h-3 w-3 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.12s]" />
            <span className="h-3 w-3 animate-bounce rounded-full bg-slate-400" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 text-right" dir="rtl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-sky-700">الحساب الشخصي</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              إعدادات الحساب
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              إدارة بياناتك الشخصية، كلمة المرور، وحالة الاشتراك.
            </p>
          </div>

          <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
            {user?.isActive ? "حساب مفعل" : "حساب غير مفعل"}
          </span>
        </div>
      </section>

      {message ? (
        <section className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-bold text-sky-800">
          {message}
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">الملف الشخصي</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-black text-slate-500">الاسم</span>
              <input
                value={profileForm.name}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black text-slate-500">الاسم الرسمي</span>
              <input
                value={profileForm.officialName}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, officialName: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black text-slate-500">رقم الجوال</span>
              <input
                value={profileForm.phone}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black text-slate-500">المسمى الوظيفي</span>
              <input
                value={profileForm.jobTitle}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, jobTitle: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black text-slate-500">الجنس</span>
              <select
                value={profileForm.gender}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, gender: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
              >
                <option value="UNKNOWN">غير محدد</option>
                <option value="MALE">ذكر</option>
                <option value="FEMALE">أنثى</option>
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-xs font-black text-slate-500">البريد الإلكتروني</span>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                {user?.email || "—"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={saveProfile}
            disabled={savingProfile}
            className="mt-6 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            {savingProfile ? "جاري الحفظ..." : "حفظ بيانات الحساب"}
          </button>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">ملخص الحساب</h2>

            <div className="mt-5 space-y-3 text-sm font-bold">
              <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-slate-500">الدور</span>
                <span>{roleLabel(user?.role || "")}</span>
              </div>

              <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-slate-500">الجنس</span>
                <span>{genderLabel(user?.gender || null)}</span>
              </div>

              <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-slate-500">آخر تحديث</span>
                <span>{formatDate(user?.updatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">الاشتراك</h2>

            <div className="mt-5 space-y-3 text-sm font-bold">
              <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-slate-500">الخطة</span>
                <span>{subscription?.subscription?.planName || "—"}</span>
              </div>

              <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-slate-500">الحالة</span>
                <span>{subscriptionStatusLabel(subscription?.subscription?.status)}</span>
              </div>

              <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-slate-500">الأيام المتبقية</span>
                <span>{subscription?.remainingDays ?? "—"}</span>
              </div>
            </div>

            <Link
              href="/dashboard/subscription"
              className="mt-5 inline-flex rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-100"
            >
              إدارة الاشتراك
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">تغيير كلمة المرور</h2>

          <div className="mt-5 space-y-4">
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              placeholder="كلمة المرور الحالية"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
            />

            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              placeholder="كلمة المرور الجديدة"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
            />

            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              placeholder="تأكيد كلمة المرور الجديدة"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
            />
          </div>

          <button
            type="button"
            onClick={changePassword}
            disabled={savingPassword}
            className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {savingPassword ? "جاري التغيير..." : "تغيير كلمة المرور"}
          </button>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">الأمان والجلسات</h2>

          <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
            عند استخدام جهاز عام أو عند الشك بوجود دخول غير مصرح، يمكنك تسجيل الخروج من كل الأجهزة الأخرى مع إبقاء الجلسة الحالية.
          </p>

          <button
            type="button"
            onClick={logoutOtherSessions}
            disabled={loggingOutOthers}
            className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            {loggingOutOthers ? "جاري التنفيذ..." : "تسجيل الخروج من الأجهزة الأخرى"}
          </button>
        </div>
      </section>
    </main>
  );
}