import { AuthCard } from "@/components/auth/auth-card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <AuthCard title="تسجيل الدخول" description="واجهة جاهزة للربط لاحقًا مع نظام المصادقة والصلاحيات.">
        <form className="space-y-4">
          <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="البريد الإلكتروني" />
          <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="كلمة المرور" type="password" />
          <button className="w-full rounded-2xl bg-sky-600 px-4 py-3 font-bold text-white">دخول</button>
        </form>
      </AuthCard>
    </main>
  );
}
