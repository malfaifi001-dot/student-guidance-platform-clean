import { AuthCard } from "@/components/auth/auth-card";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <AuthCard title="استعادة كلمة المرور" description="أدخل بريدك لإرسال رابط الاستعادة لاحقًا.">
        <form className="space-y-4">
          <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="البريد الإلكتروني" />
          <button className="w-full rounded-2xl bg-sky-600 px-4 py-3 font-bold text-white">إرسال الرابط</button>
        </form>
      </AuthCard>
    </main>
  );
}
