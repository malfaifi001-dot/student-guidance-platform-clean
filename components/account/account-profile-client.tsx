"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Laptop,
  Lock,
  LogOut,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";

type AccountUser = {
  id: string;
  name: string;
  officialName: string;
  email: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "UNKNOWN";
  role: string;
  jobTitle: string;
  onboardingCompleted: boolean;
  schoolName: string;
};

type AccountSession = {
  id: string;
  tokenId: string;
  userAgent: string | null;
  ipAddress: string | null;
  isActive: boolean;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
  createdAt: string;
};

type AccountPayload = {
  user: AccountUser;
  currentSessionId: string;
  sessions: AccountSession[];
  singleActiveSessionEnabled: boolean;
};

const EMPTY_USER: AccountUser = {
  id: "",
  name: "",
  officialName: "",
  email: "",
  phone: "",
  gender: "MALE",
  role: "COUNSELOR",
  jobTitle: "",
  onboardingCompleted: false,
  schoolName: "",
};

export function AccountProfileClient() {
  const [data, setData] = useState<AccountPayload | null>(null);
  const [form, setForm] = useState<AccountUser>(EMPTY_USER);
  const [initialForm, setInitialForm] = useState<AccountUser>(EMPTY_USER);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [endingSessions, setEndingSessions] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const hasProfileChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const activeSessions = useMemo(() => {
    return data?.sessions.filter((session) => session.isActive && !session.revokedAt) || [];
  }, [data]);

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
    try {
      setLoading(true);

      const response = await fetch("/api/dashboard/account", {
        cache: "no-store",
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "تعذر تحميل بيانات الحساب.");
      }

      setData(json.data);
      setForm(json.data.user);
      setInitialForm(json.data.user);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تحميل الحساب.",
      });
    } finally {
      setLoading(false);
    }
  }

  function update<K extends keyof AccountUser>(key: K, value: AccountUser[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveProfile() {
    try {
      setFeedback(null);
      setSavingProfile(true);

      const response = await fetch("/api/dashboard/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "تعذر حفظ الحساب.");
      }

      setInitialForm(form);
      setFeedback({
        type: "success",
        message: "تم حفظ بيانات الحساب بنجاح.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "حدث خطأ أثناء حفظ الحساب.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    try {
      setFeedback(null);
      setSavingPassword(true);

      const response = await fetch("/api/dashboard/account/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordForm),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "تعذر تغيير كلمة المرور.");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setFeedback({
        type: "success",
        message: json.message || "تم تغيير كلمة المرور.",
      });

      await loadAccount();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تغيير كلمة المرور.",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function logoutOtherSessions() {
    try {
      setFeedback(null);
      setEndingSessions(true);

      const response = await fetch(
        "/api/dashboard/account/sessions/logout-others",
        {
          method: "POST",
        }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "تعذر إنهاء الجلسات.");
      }

      setFeedback({
        type: "success",
        message: json.message || "تم إنهاء الجلسات الأخرى.",
      });

      await loadAccount();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إنهاء الجلسات.",
      });
    } finally {
      setEndingSessions(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 shadow-sm">
        جاري تحميل حسابك...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HeroCard
        user={form}
        activeSessionsCount={activeSessions.length}
        singleActiveSessionEnabled={Boolean(data?.singleActiveSessionEnabled)}
      />

      {feedback ? (
        <div
          className={[
            "rounded-2xl border px-4 py-3 text-sm font-bold leading-7",
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : feedback.type === "info"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-red-200 bg-red-50 text-red-700",
          ].join(" ")}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            icon={<UserRound className="h-5 w-5" />}
            eyebrow="الملف الشخصي"
            title="بيانات الحساب"
            description="هذه البيانات تحدد اسمك وظهورك داخل التقارير والواجهة."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Input
              label="الاسم"
              value={form.name}
              onChange={(value) => update("name", value)}
            />

            <Input
              label="الاسم الرسمي في التقارير"
              value={form.officialName}
              onChange={(value) => update("officialName", value)}
            />

            <Input
              label="البريد الإلكتروني"
              value={form.email}
              disabled
              onChange={() => null}
            />

            <Input
              label="رقم الجوال"
              value={form.phone}
              onChange={(value) => update("phone", value)}
            />

            <Input
              label="المسمى الوظيفي"
              value={form.jobTitle}
              onChange={(value) => update("jobTitle", value)}
            />

            <div>
              <p className="text-sm font-black text-slate-700">الصفة</p>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <ChoiceButton
                  active={form.gender === "MALE"}
                  label="موجه طلابي"
                  onClick={() => update("gender", "MALE")}
                />

                <ChoiceButton
                  active={form.gender === "FEMALE"}
                  label="موجهة طلابية"
                  onClick={() => update("gender", "FEMALE")}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={!hasProfileChanges || savingProfile}
              onClick={saveProfile}
              className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingProfile ? "جاري الحفظ..." : "حفظ بيانات الحساب"}
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            icon={<Lock className="h-5 w-5" />}
            eyebrow="الأمان"
            title="تغيير كلمة المرور"
            description="عند تغيير كلمة المرور سيتم إنهاء الجلسات الأخرى تلقائيًا."
          />

          <div className="mt-6 space-y-4">
            <Input
              type="password"
              label="كلمة المرور الحالية"
              value={passwordForm.currentPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({
                  ...current,
                  currentPassword: value,
                }))
              }
            />

            <Input
              type="password"
              label="كلمة المرور الجديدة"
              value={passwordForm.newPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({
                  ...current,
                  newPassword: value,
                }))
              }
            />

            <Input
              type="password"
              label="تأكيد كلمة المرور الجديدة"
              value={passwordForm.confirmPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({
                  ...current,
                  confirmPassword: value,
                }))
              }
            />

            <button
              type="button"
              onClick={changePassword}
              disabled={savingPassword}
              className="w-full rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {savingPassword ? "جاري التغيير..." : "تغيير كلمة المرور"}
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            icon={<ShieldCheck className="h-5 w-5" />}
            eyebrow="الجلسات والأجهزة"
            title="الأجهزة التي دخلت إلى حسابك"
            description="راقب الجلسات النشطة وأنهِ الأجهزة الأخرى عند الحاجة."
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={logoutOtherSessions}
              disabled={endingSessions}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {endingSessions ? "جاري الإنهاء..." : "تسجيل الخروج من الأجهزة الأخرى"}
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {data?.sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              current={session.id === data.currentSessionId}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroCard({
  user,
  activeSessionsCount,
  singleActiveSessionEnabled,
}: {
  user: AccountUser;
  activeSessionsCount: number;
  singleActiveSessionEnabled: boolean;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl">
      <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-blue-500/30 blur-3xl" />
      <div className="absolute -bottom-24 right-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-sky-100">
            <Sparkles className="h-4 w-4" />
            مساحة الحساب الشخصي
          </div>

          <h1 className="mt-5 text-3xl font-black leading-[1.6]">
            {user.officialName || user.name || "حسابي"}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-8 text-slate-300">
            هذا الحساب يمثل هوية الموجه/الموجهة داخل التقارير والسجلات؛ حافظ على بياناته دقيقة ومحدثة.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
          <p className="text-sm font-black text-sky-100">ملخص سريع</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="المدرسة" value={user.schoolName || "غير مكتملة"} />
            <MiniStat label="الجلسات" value={`${activeSessionsCount}`} />
            <MiniStat label="الصفة" value={user.gender === "FEMALE" ? "موجهة" : "موجه"} />
            <MiniStat
              label="سياسة الأجهزة"
              value={singleActiveSessionEnabled ? "جهاز واحد" : "مرنة"}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <p className="text-[11px] font-bold text-slate-300">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function SectionTitle({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>

      <div>
        <p className="text-xs font-black text-blue-700">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-7 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        type={type}
        value={value || ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
      />
    </label>
  );
}

function ChoiceButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border px-4 py-3 text-sm font-black transition",
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function SessionCard({
  session,
  current,
}: {
  session: AccountSession;
  current: boolean;
}) {
  const device = getDeviceLabel(session.userAgent);
  const active = session.isActive && !session.revokedAt;

  return (
    <article
      className={[
        "rounded-3xl border p-4",
        current
          ? "border-blue-200 bg-blue-50"
          : active
            ? "border-slate-200 bg-white"
            : "border-slate-200 bg-slate-50 opacity-70",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <div
            className={[
              "flex h-11 w-11 items-center justify-center rounded-2xl",
              current ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            {device.includes("جوال") ? (
              <Smartphone className="h-5 w-5" />
            ) : (
              <Laptop className="h-5 w-5" />
            )}
          </div>

          <div>
            <p className="text-sm font-black text-slate-950">
              {device}
              {current ? " · الجهاز الحالي" : ""}
            </p>
            <p className="mt-1 max-w-2xl text-xs font-bold leading-6 text-slate-500">
              {session.userAgent || "متصفح غير معروف"}
            </p>

            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
              <span>IP: {session.ipAddress || "غير متاح"}</span>
              <span>آخر نشاط: {formatDate(session.lastSeenAt)}</span>
              <span>بداية الجلسة: {formatDate(session.createdAt)}</span>
            </div>
          </div>
        </div>

        <span
          className={[
            "rounded-full px-3 py-1 text-[11px] font-black",
            active
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-200 text-slate-500",
          ].join(" ")}
        >
          {active ? "نشطة" : "منتهية"}
        </span>
      </div>
    </article>
  );
}

function getDeviceLabel(userAgent: string | null) {
  const value = userAgent || "";

  if (/iPhone|Android|Mobile/i.test(value)) return "جوال أو جهاز لوحي";
  if (/Windows/i.test(value)) return "جهاز Windows";
  if (/Macintosh|Mac OS/i.test(value)) return "جهاز Mac";
  if (/Linux/i.test(value)) return "جهاز Linux";

  return "جهاز غير معروف";
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "غير متاح";
  }
}
