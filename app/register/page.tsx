"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          gender,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر إنشاء الحساب.");
      }

      window.location.href = data.redirectTo || "/dashboard/onboarding";
    } catch (error) {
      setError(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_460px]">
        <div className="flex flex-col justify-center rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl">
          <p className="text-sm font-black text-sky-200">منصة التوجيه الطلابي</p>
          <h1 className="mt-4 text-4xl font-black leading-[1.7]">
            أنشئ حسابك كموجه أو موجهة خلال أقل من دقيقة
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-300">
            نطلب بيانات أساسية فقط الآن. بعد الدخول ستكمل بيانات المدرسة والهوية الرسمية للتقارير من داخل المنصة.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-black text-slate-950">إنشاء حساب جديد</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            استخدم بريدك ورقم جوالك لإنشاء حساب فردي للموجه/الموجهة.
          </p>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            <AuthInput label="الاسم الكامل" value={name} onChange={setName} />
            <AuthInput label="البريد الإلكتروني" type="email" value={email} onChange={setEmail} />
            <AuthInput label="رقم الجوال" value={phone} onChange={setPhone} />
            <AuthInput label="كلمة المرور" type="password" value={password} onChange={setPassword} />
            <AuthInput label="تأكيد كلمة المرور" type="password" value={confirmPassword} onChange={setConfirmPassword} />

            <div>
              <p className="text-sm font-black text-slate-700">الصفة</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender("MALE")}
                  className={[
                    "rounded-2xl border px-4 py-3 text-sm font-black transition",
                    gender === "MALE"
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  موجه طلابي
                </button>

                <button
                  type="button"
                  onClick={() => setGender("FEMALE")}
                  className={[
                    "rounded-2xl border px-4 py-3 text-sm font-black transition",
                    gender === "FEMALE"
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  موجهة طلابية
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
            </button>

            <a
              href="/login"
              className="block text-center text-sm font-bold text-slate-500 hover:text-slate-900"
            >
              لدي حساب بالفعل
            </a>
          </div>
        </form>
      </section>
    </main>
  );
}

function AuthInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        required
      />
    </label>
  );
}
