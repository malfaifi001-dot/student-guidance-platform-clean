import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export async function requireAdminPage() {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    redirect("/login");
  }

  if (current.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return current;
}
