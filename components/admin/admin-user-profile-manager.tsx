"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Eye,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";

export type ManagedUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  gender: string | null;
  officialName: string | null;
  jobTitle: string | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  schoolAccount: Record<string, unknown> | null;
};

type Props = {
  initialUser: ManagedUser;
};

function roleLabel(role: string) {
  if (role === "ADMIN") return "أدمن";
  if (role === "COUNSELOR") return "موجه / موجهة";
  if (role === "TEACHER") return "معلم";
  if (role === "SCHOOL_OWNER") return "مالك مدرسة";
  if (role === "STAFF") return "موظف";
  return role;
}

function genderLabel(gender?: string | null) {
  if (gender === "FEMALE") return "أنثى";
  return "ذكر";
}

function valueOrDash(value: unknown) {
  const text = String(value || "").trim();
  return text || "غير محدد";
}

function formatDate(value?: string | null) {
  if (!value) return "غير محدد";

  try {
    return new Date(value).toLocaleString("ar-SA");
  } catch {
    return "غير محدد";
  }
}

export function AdminUserProfileManager({ initialUser }: Props) {
  const [user, setUser] = useState(initialUser);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">("info");

  const schoolInfo = useMemo(() => {
    const account = user.schoolAccount || {};

    return {
      schoolName: valueOrDash(account.schoolName || account.name),
      principalName: valueOrDash(account.principalName),
      educationDepartment: valueOrDash(account.educationDepartment),
      city: valueOrDash(account.city),
      stage: valueOrDash(account.stage),
      phone: valueOrDash(account.phone),
      email: valueOrDash(account.email),
    };
  }, [user.schoolAccount]);

  function showMessage(text: string, tone: "success" | "error" | "info" = "info") {
    setMessage(text);
    setMessageTone(tone);
  }

  function updateField(field: keyof ManagedUser, value: string | boolean) {
    setUser((current) => ({ ...current, [field]: value }));
  }

  async function saveUser() {
    setSaving(true);
    showMessage("");

    const response = await fetch(`/api/dashboard/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showMessage(data.error || "تعذر حفظ بيانات المستخدم.", "error");
      setSaving(false);
      return;
    }

    showMessage("تم حفظ بيانات المستخدم بنجاح.", "success");
    setSaving(false);
  }

  async function changePassword() {
    if (password.trim().length < 8) {
      showMessage("كلمة المرور يجب ألا تقل عن 8 أحرف.", "error");
      return;
    }

    setSaving(true);
    showMessage("");

    const response = await fetch(`/api/dashboard/admin/users/${user.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showMessage(data.error || "تعذر تغيير كلمة المرور.", "error");
      setSaving(false);
      return;
    }

    setPassword("");
    showMessage("تم تغيير كلمة المرور بنجاح.", "success");
    setSaving(false);
  }

  async function impersonateUser() {
    const ok = confirm(
      "سيتم الدخول بحساب هذا المستخدم. للرجوع للأدمن سجّل خروج ثم ادخل بحساب الأدمن."
    );

    if (!ok) return;

    setSaving(true);
    showMessage("");

    const response = await fetch(`/api/dashboard/admin/users/${user.id}/impersonate`, {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showMessage(data.error || "تعذر الدخول بحساب المستخدم.", "error");
      setSaving(false);
      return;
    }

    window.location.href = data.redirectTo || "/dashboard";
  }

  const messageClass = {
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
    error: "border-rose-100 bg-rose-50 text-rose-700",
    info: "border-blue-100 bg-blue-50 text-blue-700",
  }[messageTone];

  return (
    <div dir="rtl" className="space-y-6 pb-24">
      <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm">
        <div className="relative overflow-hidden bg-slate-950 p-6 text-white">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-white/10 ring-1 ring-white/10">
                <UserRound className="h-8 w-8" />
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-blue-100 ring-1 ring-white/10">
                  <Sparkles className="h-4 w-4" />
                  مركز التحكم بالمستخدم
                </div>

                <h1 className="mt-3 text-3xl font-black">
                  {user.officialName || user.name || user.email}
                </h1>

                <p className="mt-2 text-sm font-bold text-slate-300">
                  {user.email}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                  <StatusPill>{roleLabel(user.role)}</StatusPill>
                  <StatusPill>{genderLabel(user.gender)}</StatusPill>
                  <StatusPill tone={user.isActive ? "success" : "danger"}>
                    {user.isActive ? "نشط" : "موقوف"}
                  </StatusPill>
                  <StatusPill tone={user.onboardingCompleted ? "info" : "warning"}>
                    {user.onboardingCompleted ? "مكتمل الإعداد" : "لم يكمل الإعداد"}
                  </StatusPill>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/admin/users"
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/15"
              >
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Link>

              <button
                onClick={impersonateUser}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                الدخول كالمستخدم
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-4">
          <SummaryCard icon={<Mail />} label="البريد" value={user.email} />
          <SummaryCard icon={<Phone />} label="الجوال" value={user.phone || "غير محدد"} />
          <SummaryCard icon={<Building2 />} label="المدرسة" value={schoolInfo.schoolName} />
          <SummaryCard icon={<ShieldCheck />} label="الدور" value={roleLabel(user.role)} />
        </div>
      </section>

      {message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-black ${messageClass}`}>
          {message}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              icon={<BadgeCheck />}
              title="البيانات الأساسية"
              description="تحكم في بيانات الحساب التي تظهر داخل المنصة والتقارير."
              tone="blue"
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="الاسم المختصر">
                <input
                  value={user.name || ""}
                  onChange={(event) => updateField("name", event.target.value)}
                  className="field-input"
                  placeholder="مثال: محمد العلي"
                />
              </Field>

              <Field label="الاسم الرسمي">
                <input
                  value={user.officialName || ""}
                  onChange={(event) => updateField("officialName", event.target.value)}
                  className="field-input"
                  placeholder="الاسم الرسمي في التقارير"
                />
              </Field>

              <Field label="البريد الإلكتروني">
                <input
                  value={user.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="field-input"
                  placeholder="email@example.com"
                />
              </Field>

              <Field label="رقم الجوال">
                <input
                  value={user.phone || ""}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className="field-input"
                  placeholder="05xxxxxxxx"
                />
              </Field>

              <Field label="المسمى الوظيفي">
                <input
                  value={user.jobTitle || ""}
                  onChange={(event) => updateField("jobTitle", event.target.value)}
                  className="field-input"
                  placeholder="مثال: موجه طلابي"
                />
              </Field>

              <Field label="الدور">
                <select
                  value={user.role}
                  onChange={(event) => updateField("role", event.target.value)}
                  className="field-input"
                >
                  <option value="ADMIN">أدمن</option>
                  <option value="COUNSELOR">موجه / موجهة</option>
                  <option value="TEACHER">معلم</option>
                  <option value="SCHOOL_OWNER">مالك مدرسة</option>
                  <option value="STAFF">موظف</option>
                </select>
              </Field>

              <Field label="الجنس">
                <select
                  value={user.gender || "MALE"}
                  onChange={(event) => updateField("gender", event.target.value)}
                  className="field-input"
                >
                  <option value="MALE">ذكر</option>
                  <option value="FEMALE">أنثى</option>
                </select>
              </Field>

              <div className="grid gap-3 rounded-3xl bg-slate-50 p-4">
                <ToggleRow
                  label="الحساب مفعل"
                  checked={user.isActive}
                  onChange={(checked) => updateField("isActive", checked)}
                />

                <ToggleRow
                  label="مكتمل الإعداد"
                  checked={user.onboardingCompleted}
                  onChange={(checked) => updateField("onboardingCompleted", checked)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              icon={<KeyRound />}
              title="كلمة المرور"
              description="كلمة المرور القديمة محمية ولا تظهر. تستطيع تعيين كلمة جديدة فقط."
              tone="slate"
            />

            <div className="mt-6 flex flex-wrap gap-3">
              <input
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="كلمة المرور الجديدة"
                className="field-input min-w-[260px] flex-1"
              />

              <button
                onClick={changePassword}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                <LockKeyhole className="h-4 w-4" />
                تغيير كلمة المرور
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              icon={<Building2 />}
              title="هوية المدرسة"
              description="معلومات المدرسة المرتبطة بهذا الحساب."
              tone="emerald"
            />

            <div className="mt-6 grid gap-3">
              <InfoLine label="اسم المدرسة" value={schoolInfo.schoolName} />
              <InfoLine label="قائد/مدير المدرسة" value={schoolInfo.principalName} />
              <InfoLine label="إدارة التعليم" value={schoolInfo.educationDepartment} />
              <InfoLine label="المدينة" value={schoolInfo.city} />
              <InfoLine label="المرحلة" value={schoolInfo.stage} />
              <InfoLine label="هاتف المدرسة" value={schoolInfo.phone} />
              <InfoLine label="بريد المدرسة" value={schoolInfo.email} />
            </div>

            <Link
              href="/dashboard/settings/school"
              className="mt-5 flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              فتح هوية المدرسة
            </Link>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              icon={<CheckCircle2 />}
              title="معلومات النظام"
              description="بيانات مرجعية للحساب."
              tone="violet"
            />

            <div className="mt-6 grid gap-3">
              <InfoLine label="معرّف المستخدم" value={user.id} />
              <InfoLine label="تاريخ الإنشاء" value={formatDate(user.createdAt)} />
              <InfoLine label="آخر تحديث" value={formatDate(user.updatedAt)} />
            </div>
          </div>

          <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-6">
            <div className="flex gap-3">
              <XCircle className="mt-1 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <h3 className="font-black text-amber-900">ملاحظة تشغيلية</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-amber-800">
                  عند الدخول كالمستخدم سيتم تبديل جلستك الحالية. للعودة إلى الأدمن سجّل خروج ثم ادخل بحساب الأدمن.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
        <div>
          <p className="text-sm font-black text-slate-950">
            {user.officialName || user.name || user.email}
          </p>
          <p className="text-xs font-bold text-slate-500">
            {saving ? "جاري تنفيذ العملية..." : "جاهز للحفظ أو المعاينة"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={impersonateUser}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-800 transition hover:bg-slate-200 disabled:opacity-50"
          >
            <Eye className="h-4 w-4" />
            دخول
          </button>

          <button
            onClick={saveUser}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2 text-xs font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ
          </button>
        </div>
      </div>

      <style jsx>{`
        .field-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.85rem 1rem;
          font-size: 0.9rem;
          font-weight: 700;
          outline: none;
          transition: 160ms ease;
        }

        .field-input:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 4px rgb(219 234 254);
        }
      `}</style>
    </div>
  );
}

function StatusPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "danger" | "warning" | "info";
}) {
  const className = {
    default: "bg-white/10 text-white",
    success: "bg-emerald-400/15 text-emerald-200",
    danger: "bg-rose-400/15 text-rose-200",
    warning: "bg-amber-400/15 text-amber-200",
    info: "bg-blue-400/15 text-blue-200",
  }[tone];

  return <span className={`rounded-full px-3 py-1 ${className}`}>{children}</span>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SectionTitle({
  icon,
  title,
  description,
  tone,
}: {
  icon: React.ReactElement;
  title: string;
  description: string;
  tone: "blue" | "emerald" | "slate" | "violet";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
    violet: "bg-violet-50 text-violet-700",
  }[tone];

  return (
    <div className="flex items-center gap-3">
      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${toneClass}`}>
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-bold text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-600 shadow-sm">
        {icon}
      </div>
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="font-black text-slate-800">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5"
      />
    </label>
  );
}
