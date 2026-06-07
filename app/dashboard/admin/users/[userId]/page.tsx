import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  AdminUserProfileManager,
  type ManagedUser,
} from "@/components/admin/admin-user-profile-manager";

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

function extractUser(sessionResult: unknown) {
  const value = sessionResult as any;
  return value?.user ?? value?.session?.user ?? value;
}

export default async function AdminUserDetailsPage({ params }: PageProps) {
  const sessionResult = await getCurrentSessionUser();
  const currentUser = extractUser(sessionResult);

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      schoolAccount: true,
    },
  });

  if (!user) {
    notFound();
  }

  const initialUser = JSON.parse(JSON.stringify(user)) as ManagedUser;

  return (
    <div className="p-6">
      <AdminUserProfileManager initialUser={initialUser} />
    </div>
  );
}
