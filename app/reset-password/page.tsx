import { AuthCard } from "@/components/auth/auth-card";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <AuthCard title="تعيين كلمة مرور جديدة" description="هذه الواجهة جاهزة لربط token الاستعادة لاحقًا.">
        <form className="space-y-4">
          <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="كلمة المرور الجديدة" type="password" />
          <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="تأكيد كلمة المرور" type="password" />
          <button className="w-full rounded-2xl bg-sky-600 px-4 py-3 font-bold text-white">حفظ كلمة المرور</button>
        </form>
      </AuthCard>
    </main>
  );
}
