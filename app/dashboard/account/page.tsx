"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import {
  TEACHING_STAGE_OPTIONS,
  TEACHING_SPECIALTY_OPTIONS,
  TEACHING_SUBJECT_OPTIONS,
} from "@/lib/account/teaching-profile-options";

type AccountUser = {
  id: string;
  name: string;
  officialName: string | null;
  email: string;
  phone: string | null;
  role: string;
  gender: string | null;
  jobTitle: string | null;
  teachingStages: string[];
  teachingSpecialties: string[];
  teachingSubjects: string[];
  schoolAccountId: string | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  onboardingSkippedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function roleLabel(role: string, gender?: string | null) {
  if (role === "ADMIN") return "مدير النظام";
  if (role === "COUNSELOR") return "موجه طلابي";
  if (role === "ACTIVITY_LEADER") return "رائد نشاط";
  if (role === "TEACHER") return "معلم";
  if (role === "PRINCIPAL") return gender === "FEMALE" ? "مديرة المدرسة" : "مدير المدرسة";
  if (role === "SCHOOL_OWNER") return "مالك مدرسة";
  if (role === "STAFF") return "موظف";
  return role;
}

function genderLabel(gender: string | null) {
  if (gender === "MALE") return "ذكر";
  if (gender === "FEMALE") return "أنثى";
  return "غير محدد";
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

function uniqueList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

export default function DashboardAccountPage() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loggingOutOthers, setLoggingOutOthers] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    officialName: "",
    phone: "",
    jobTitle: "",
    gender: "UNKNOWN",
    teachingStages: [] as string[],
    teachingSpecialties: [] as string[],
    teachingSubjects: [] as string[],
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
      const accountResponse = await fetch("/api/dashboard/account", { cache: "no-store" });

      const accountResult = await readJson(accountResponse);

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
        teachingStages: uniqueList(nextUser.teachingStages),
        teachingSpecialties: uniqueList(nextUser.teachingSpecialties),
        teachingSubjects: uniqueList(nextUser.teachingSubjects),
      });

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
          confirmPassword: passwordForm.confirmPassword,
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

  async function deleteAccount() {
    if (deletePhrase.trim() !== "حذف الحساب") return;

    setDeleting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/account", { method: "DELETE" });
      const result = await readJson(response);
      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر حذف الحساب.");
      }
      window.location.href = result.redirectTo || "/login?account=deleted";
    } catch (error) {
      setDeleting(false);
      setDeleteOpen(false);
      setMessage(error instanceof Error ? error.message : "تعذر حذف الحساب.");
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
            <h1 className="mt-2 text-3xl font-black text-slate-950">إعدادات الحساب</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              إدارة بياناتك الشخصية، بيانات التدريس، كلمة المرور، وحالة الاشتراك.
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
            <InputField
              label="الاسم"
              value={profileForm.name}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, name: value }))}
            />

            <InputField
              label="الاسم الرسمي"
              value={profileForm.officialName}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, officialName: value }))}
            />

            <InputField
              label="رقم الجوال"
              value={profileForm.phone}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, phone: value }))}
            />

            <InputField
              label="المسمى الوظيفي"
              value={profileForm.jobTitle}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, jobTitle: value }))}
            />

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

          <div className="mt-7 rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-4">
            <div>
              <p className="text-sm font-black text-slate-900">بيانات التدريس</p>
              <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                تستخدم هذه البيانات لاحقًا لتحسين نتائج الذكاء الاصطناعي تلقائيًا دون تقييد وصفك.
              </p>
            </div>

            <div className="mt-4 grid gap-4">
              <SearchableMultiSelect
                label="المرحلة"
                placeholder="ابحث عن مرحلة..."
                options={TEACHING_STAGE_OPTIONS}
                value={profileForm.teachingStages}
                onChange={(value) => setProfileForm((prev) => ({ ...prev, teachingStages: value }))}
              />

              <SearchableMultiSelect
                label="التخصص"
                placeholder="ابحث عن تخصص..."
                options={TEACHING_SPECIALTY_OPTIONS}
                value={profileForm.teachingSpecialties}
                onChange={(value) => setProfileForm((prev) => ({ ...prev, teachingSpecialties: value }))}
              />

              <SearchableMultiSelect
                label="مواد أدرسها"
                placeholder="ابحث عن مادة..."
                options={TEACHING_SUBJECT_OPTIONS}
                value={profileForm.teachingSubjects}
                onChange={(value) => setProfileForm((prev) => ({ ...prev, teachingSubjects: value }))}
              />
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
              <SummaryRow label="الدور" value={roleLabel(user?.role || "", user?.gender)} />
              <SummaryRow label="الجنس" value={genderLabel(user?.gender || null)} />
              <SummaryRow label="المراحل" value={user?.teachingStages?.length ? user.teachingStages.join("، ") : "—"} />
              <SummaryRow label="التخصص" value={user?.teachingSpecialties?.length ? user.teachingSpecialties.join("، ") : "—"} />
              <SummaryRow label="آخر تحديث" value={formatDate(user?.updatedAt)} />
            </div>
          </div>

        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">تغيير كلمة المرور</h2>

          <div className="mt-5 space-y-4">
            <PasswordInput
              value={passwordForm.currentPassword}
              onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
              placeholder="كلمة المرور الحالية"
            />

            <PasswordInput
              value={passwordForm.newPassword}
              onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
              placeholder="كلمة المرور الجديدة"
            />

            <PasswordInput
              value={passwordForm.confirmPassword}
              onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
              placeholder="تأكيد كلمة المرور الجديدة"
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

          <div className="mt-8 border-t border-rose-200 pt-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">حذف الحساب</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                  سيتم تعطيل حسابك وإلغاء جميع الجلسات النشطة. لا يمكن التراجع عن هذا الإجراء من داخل الحساب.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="mt-5 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700"
            >
              حذف الحساب
            </button>
          </div>
        </div>
      </section>

      <SmartActionModal
        open={deleteOpen}
        title="تأكيد حذف الحساب"
        description="اكتب العبارة التالية للتأكيد: حذف الحساب"
        variant="danger"
        confirmLabel="حذف الحساب نهائياً"
        cancelLabel="إلغاء"
        loading={deleting}
        onConfirm={() => void deleteAccount()}
        onClose={() => !deleting && setDeleteOpen(false)}
      >
        <label className="block">
          <span className="text-sm font-black text-slate-700">عبارة التأكيد</span>
          <input
            value={deletePhrase}
            onChange={(event) => setDeletePhrase(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
            autoComplete="off"
          />
        </label>
      </SmartActionModal>
    </main>
  );
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
      />
    </label>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="password"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
    />
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-left leading-6">{value}</span>
    </div>
  );
}

function SearchableMultiSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => uniqueList(value), [value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return options;

    return options.filter((option) => option.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
      return;
    }

    onChange([...selected, option]);
  }

  function clearAll() {
    onChange([]);
    setQuery("");
  }

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-black text-slate-500">{label}</span>

        {selected.length ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-black text-rose-600 hover:text-rose-700"
          >
            مسح الكل
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold outline-none transition hover:border-sky-200 focus:border-sky-300"
      >
        {selected.length ? (
          <span className="flex flex-wrap gap-2">
            {selected.slice(0, 5).map((item) => (
              <span
                key={item}
                className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700"
              >
                {item}
              </span>
            ))}

            {selected.length > 5 ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                +{selected.length - 5}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-slate-400">اختر...</span>
        )}
      </button>

      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200">
          <div className="border-b border-slate-100 p-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
            />
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const active = selected.includes(option);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggle(option)}
                    className={[
                      "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-right text-sm font-bold transition",
                      active ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span>{option}</span>
                    <span
                      className={[
                        "flex h-5 w-5 items-center justify-center rounded-md border text-[10px]",
                        active
                          ? "border-sky-500 bg-sky-600 text-white"
                          : "border-slate-300 bg-white text-white",
                      ].join(" ")}
                    >
                      ✓
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-5 text-center text-sm font-bold text-slate-400">
                لا توجد نتائج مطابقة.
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-2xl bg-slate-950 px-5 py-2 text-xs font-black text-white"
            >
              تم
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
