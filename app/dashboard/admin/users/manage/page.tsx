import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

function extractUser(sessionResult: unknown) {
  const value = sessionResult as any;
  return value?.user ?? value?.session?.user ?? value;
}

export default async function AdminUsersManagePage() {
  const sessionResult = await getCurrentSessionUser();
  const currentUser = extractUser(sessionResult);

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      schoolAccount: true,
    },
  });

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-blue-600">Admin Users Manager</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          إدارة حسابات المستخدمين
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          افتح صفحة المستخدم لتعديل البيانات أو تغيير كلمة المرور أو الدخول بحسابه.
        </p>
      </div>

      <div className="grid gap-4">
        {users.map((user) => {
          const account = user.schoolAccount as unknown as Record<string, unknown> | null;
          const schoolName = String(account?.schoolName || account?.name || "بدون مدرسة");

          return (
            <div
              key={user.id}
              className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    {user.name || user.email}
                  </h2>
                  <p className="text-sm text-slate-500">{user.email}</p>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {user.role}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {schoolName}
                    </span>
                    <span
                      className={
                        user.isActive
                          ? "rounded-full bg-emerald-50 px-3 py-1 text-emerald-700"
                          : "rounded-full bg-red-50 px-3 py-1 text-red-700"
                      }
                    >
                      {user.isActive ? "نشط" : "موقوف"}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/dashboard/admin/users/${user.id}`}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
                >
                  إدارة المستخدم
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
